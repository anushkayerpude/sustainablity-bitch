import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.join(process.cwd(), 'labsync.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
    if (dbInstance) {
        return dbInstance;
    }

    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
    initializeSchema(db);
    seedInitialData(db);
    dbInstance = db;
    return dbInstance;
}

function initializeSchema(db: DatabaseSync) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      personal_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL, -- 'student' | 'teacher'
      department TEXT NOT NULL,
      semester INTEGER,
      batch TEXT,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      teacher_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS practicals (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES subjects(id),
      exp_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      aim TEXT NOT NULL,
      theory TEXT,
      algorithm TEXT,
      supported_languages TEXT NOT NULL, -- JSON array
      default_language TEXT NOT NULL,
      starter_codes TEXT NOT NULL, -- JSON map
      test_cases TEXT NOT NULL, -- JSON array
      max_marks INTEGER DEFAULT 10,
      due_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      session_code TEXT UNIQUE NOT NULL,
      subject_id TEXT REFERENCES subjects(id),
      teacher_id TEXT REFERENCES users(id),
      lab_room TEXT NOT NULL,
      batch TEXT NOT NULL,
      active_practical_id TEXT REFERENCES practicals(id),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL, -- 'active' | 'ended'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      practical_id TEXT REFERENCES practicals(id),
      student_id TEXT REFERENCES users(id),
      student_personal_id TEXT NOT NULL,
      session_id TEXT REFERENCES live_sessions(id),
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      last_output TEXT,
      test_results TEXT,
      status TEXT NOT NULL, -- 'draft' | 'in_progress' | 'submitted' | 'verified' | 'rejected'
      simultaneous_proof TEXT, -- JSON proof details
      marks_obtained REAL,
      max_marks REAL DEFAULT 10,
      teacher_remarks TEXT,
      teacher_signature TEXT,
      verified_at TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(practical_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES subjects(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      due_date TEXT NOT NULL,
      max_marks INTEGER DEFAULT 20,
      supported_languages TEXT NOT NULL,
      starter_code TEXT,
      test_cases TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT REFERENCES assignments(id),
      student_id TEXT REFERENCES users(id),
      student_personal_id TEXT NOT NULL,
      code TEXT,
      notes TEXT,
      status TEXT NOT NULL, -- 'pending' | 'submitted' | 'graded'
      marks REAL,
      feedback TEXT,
      submitted_at TEXT NOT NULL,
      UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS live_telemetry (
      student_id TEXT PRIMARY KEY REFERENCES users(id),
      session_id TEXT REFERENCES live_sessions(id),
      practical_id TEXT,
      current_language TEXT,
      keystrokes_count INTEGER DEFAULT 0,
      run_count INTEGER DEFAULT 0,
      tests_passed INTEGER DEFAULT 0,
      tests_total INTEGER DEFAULT 0,
      status_label TEXT,
      last_heartbeat TEXT NOT NULL
    );
  `);
}

function seedInitialData(db: DatabaseSync) {
    // Check if users already seeded
    const check = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (check.count > 0) return;

    // Insert Users (Staff & Students)
    const insertUser = db.prepare(`
    INSERT INTO users (id, personal_id, name, email, role, department, semester, batch, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertUser.run('teacher-1', 'PROF-CS-01', 'Dr. Maitri Patel', 'maitripatel@iar.ac.in', 'teacher', 'Computer Engineering', 5, 'IT&CE', '👨‍🏫');
    insertUser.run('teacher-2', 'PROF-CS-02', 'Dr. Harshida Chaudhary', 'harshidachaudhary@iar.ac.in', 'teacher', 'Computer Engineering', 5, 'IT&CE', '👩‍🏫');

    insertUser.run('student-1', '2023-CS-042', 'Anushka Yerpude', 'anushkayerpude.btit2024@iar.ac.in', 'student', 'Computer Engineering', 5, 'Batch A1', '👨‍💻');
    insertUser.run('student-2', '2023-CS-043', 'Niyati Joshi', 'niyatijoshi.btit2024@iar.ac.in', 'student', 'Computer Engineering', 5, 'Batch A1', '👩‍💻');
    insertUser.run('student-3', '2023-CS-044', 'Zeel Limbachiya', 'zeellimbachiya.btit2025@iar.ac.in', 'student', 'Computer Engineering', 5, 'Batch A1', '🧑‍💻');
    insertUser.run('student-4', '2023-CS-045', 'Rudrant Joshi', 'rudrantjoshi.btit2025@iar.ac.in', 'student', 'Computer Engineering', 5, 'Batch A2', '👩‍🎓');

    // Insert Subjects
    const insertSubject = db.prepare(`
    INSERT INTO subjects (id, code, title, department, semester, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    insertSubject.run('sub-1', 'CS501', 'Data Structures & Algorithms Lab', 'Computer Engineering', 5, 'teacher-1');
    insertSubject.run('sub-2', 'CS502', 'Database Management Systems Lab', 'Computer Engineering', 5, 'teacher-2');
    insertSubject.run('sub-3', 'CS503', 'Operating Systems & Systems Programming Lab', 'Computer Engineering', 5, 'teacher-1');

    // Insert Practicals
    const insertPractical = db.prepare(`
    INSERT INTO practicals (id, subject_id, exp_number, title, aim, theory, algorithm, supported_languages, default_language, starter_codes, test_cases, max_marks, due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const exp1StarterCodes = {
        c: `#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#define MAX 1000

char stack[MAX];
int top = -1;

void push(char c) {
    if (top < MAX - 1) {
        stack[++top] = c;
    }
}

char pop() {
    if (top >= 0) {
        return stack[top--];
    }
    return '\\0';
}

bool isMatching(char open, char close) {
    return (open == '(' && close == ')') ||
           (open == '{' && close == '}') ||
           (open == '[' && close == ']');
}

bool isBalanced(char* str) {
    top = -1;
    for (int i = 0; str[i] != '\\0'; i++) {
        char ch = str[i];
        if (ch == '(' || ch == '{' || ch == '[') {
            push(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (top == -1 || !isMatching(pop(), ch)) {
                return false;
            }
        }
    }
    return top == -1;
}

int main() {
    char input[MAX];
    if (fgets(input, sizeof(input), stdin)) {
        // remove newline if present
        input[strcspn(input, "\\r\\n")] = 0;
        if (isBalanced(input)) {
            printf("BALANCED\\n");
        } else {
            printf("NOT BALANCED\\n");
        }
    }
    return 0;
}`,
        cpp: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

bool isBalanced(const string& str) {
    stack<char> s;
    for (char ch : str) {
        if (ch == '(' || ch == '{' || ch == '[') {
            s.push(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (s.empty()) return false;
            char top = s.top();
            s.pop();
            if ((ch == ')' && top != '(') ||
                (ch == '}' && top != '{') ||
                (ch == ']' && top != '[')) {
                return false;
            }
        }
    }
    return s.empty();
}

int main() {
    string line;
    if (getline(cin, line)) {
        cout << (isBalanced(line) ? "BALANCED" : "NOT BALANCED") << endl;
    }
    return 0;
}`,
        python: `import sys

def is_balanced(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s.strip():
        if char in '({[':
            stack.append(char)
        elif char in mapping:
            if not stack or stack[-1] != mapping[char]:
                return False
            stack.pop()
    return len(stack) == 0

def main():
    lines = sys.stdin.read().splitlines()
    for line in lines:
        if line.strip():
            print("BALANCED" if is_balanced(line) else "NOT BALANCED")
            return
    print("BALANCED")

if __name__ == '__main__':
    main()`,
        java: `import java.util.Scanner;
import java.util.Stack;

public class Solution {
    public static boolean isBalanced(String str) {
        Stack<Character> stack = new Stack<>();
        for (char ch : str.toCharArray()) {
            if (ch == '(' || ch == '{' || ch == '[') {
                stack.push(ch);
            } else if (ch == ')' || ch == '}' || ch == ']') {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (ch == ')' && top != '(') return false;
                if (ch == '}' && top != '{') return false;
                if (ch == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String line = sc.nextLine();
            System.out.println(isBalanced(line) ? "BALANCED" : "NOT BALANCED");
        }
        sc.close();
    }
}`,
        javascript: `const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function isBalanced(str) {
    const stack = [];
    const pairs = { ')': '(', '}': '{', ']': '[' };
    for (const char of str.trim()) {
        if (['(', '{', '['].includes(char)) {
            stack.push(char);
        } else if (pairs[char]) {
            if (stack.length === 0 || stack[stack.length - 1] !== pairs[char]) {
                return false;
            }
            stack.pop();
        }
    }
    return stack.length === 0;
}

rl.on('line', (line) => {
    if (line.trim()) {
        console.log(isBalanced(line) ? "BALANCED" : "NOT BALANCED");
        process.exit(0);
    }
});`
    };

    const exp1TestCases = [
        { id: 'tc1', input: '{[()]}', expected_output: 'BALANCED', is_hidden: false, explanation: 'Well nested brackets of all types' },
        { id: 'tc2', input: '{[(])}', expected_output: 'NOT BALANCED', is_hidden: false, explanation: 'Improper crossover closing' },
        { id: 'tc3', input: '((()', expected_output: 'NOT BALANCED', is_hidden: true, explanation: 'Unclosed parentheses' },
        { id: 'tc4', input: '[]{}()', expected_output: 'BALANCED', is_hidden: true, explanation: 'Sequential balanced pairs' }
    ];

    insertPractical.run(
        'prac-1',
        'sub-1',
        1,
        'Balanced Parentheses Verification using Stack Data Structure',
        'To implement a Stack data structure in any standard engineering language (C, C++, Java, Python, JavaScript) to verify whether a given mathematical or expression string has balanced brackets.',
        'A stack is a linear data structure that follows the Last In First Out (LIFO) principle. In compiler parsers and arithmetic evaluation, checking matched delimiters ensures code syntax validity before generation of the abstract syntax tree (AST).',
        '1. Initialize an empty stack.\n2. Traverse each character in the input string.\n3. If an opening symbol (, {, [ is encountered, push it onto the stack.\n4. If a closing symbol ), }, ] is encountered, check if stack is empty. If empty, return false. Else pop top element and verify matching pair.\n5. After end of string, if stack is empty, return BALANCED, else return NOT BALANCED.',
        JSON.stringify(['c', 'cpp', 'java', 'python', 'javascript']),
        'cpp',
        JSON.stringify(exp1StarterCodes),
        JSON.stringify(exp1TestCases),
        10,
        '2026-11-28',
        new Date().toISOString()
    );

    // Practical 2: Binary Search Tree Insertion and In-order Traversal
    const exp2StarterCodes = {
        c: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *left, *right;
};

struct Node* createNode(int val) {
    struct Node* n = (struct Node*)malloc(sizeof(struct Node));
    n->data = val;
    n->left = n->right = NULL;
    return n;
}

struct Node* insert(struct Node* root, int val) {
    if (!root) return createNode(val);
    if (val < root->data) root->left = insert(root->left, val);
    else if (val > root->data) root->right = insert(root->right, val);
    return root;
}

void inOrder(struct Node* root) {
    if (!root) return;
    inOrder(root->left);
    printf("%d ", root->data);
    inOrder(root->right);
}

int main() {
    int n, val;
    struct Node* root = NULL;
    if (scanf("%d", &n) == 1) {
        for (int i = 0; i < n; i++) {
            if (scanf("%d", &val) == 1) {
                root = insert(root, val);
            }
        }
        inOrder(root);
        printf("\\n");
    }
    return 0;
}`,
        cpp: `#include <iostream>
using namespace std;

struct Node {
    int val;
    Node* left;
    Node* right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int v) {
    if (!root) return new Node(v);
    if (v < root->val) root->left = insert(root->left, v);
    else if (v > root->val) root->right = insert(root->right, v);
    return root;
}

void inorder(Node* root) {
    if (!root) return;
    inorder(root->left);
    cout << root->val << " ";
    inorder(root->right);
}

int main() {
    int n;
    if (cin >> n) {
        Node* root = nullptr;
        for (int i = 0; i < n; i++) {
            int x;
            cin >> x;
            root = insert(root, x);
        }
        inorder(root);
        cout << "\\n";
    }
    return 0;
}`,
        python: `import sys

class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if not root:
        return Node(val)
    if val < root.val:
        root.left = insert(root.left, val)
    elif val > root.val:
        root.right = insert(root.right, val)
    return root

def inorder(root, res):
    if not root:
        return
    inorder(root.left, res)
    res.append(str(root.val))
    inorder(root.right, res)

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    elements = [int(x) for x in input_data[1:n+1]]
    root = None
    for el in elements:
        root = insert(root, el)
    res = []
    inorder(root, res)
    print(" ".join(res))

if __name__ == '__main__':
    main()`,
        java: `import java.util.Scanner;

class Node {
    int val;
    Node left, right;
    Node(int v) { val = v; }
}

public class Solution {
    public static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else if (val > root.val) root.right = insert(root.right, val);
        return root;
    }

    public static void inorder(Node root) {
        if (root == null) return;
        inorder(root.left);
        System.out.print(root.val + " ");
        inorder(root.right);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            Node root = null;
            for (int i = 0; i < n; i++) {
                root = insert(root, sc.nextInt());
            }
            inorder(root);
            System.out.println();
        }
        sc.close();
    }
}`
    };

    const exp2TestCases = [
        { id: 'tc1', input: '5\n50 30 70 20 40', expected_output: '20 30 40 50 70', is_hidden: false, explanation: 'In-order traversal produces strictly ascending sorted order' },
        { id: 'tc2', input: '4\n10 5 15 2', expected_output: '2 5 10 15', is_hidden: false, explanation: 'Unbalanced left-leaning tree' }
    ];

    insertPractical.run(
        'prac-2',
        'sub-1',
        2,
        'Binary Search Tree Construction & In-Order Traversal',
        'To construct a Binary Search Tree (BST) from N integer values and demonstrate that an In-Order traversal yields sorted values in O(N) time.',
        'In a BST, for every node, values in the left subtree are strictly lesser, and values in the right subtree are strictly greater. In-order traversal visits (Left, Root, Right), which mathematically generates a non-decreasing sorted sequence.',
        '1. Read total number of nodes N.\n2. For each element, insert recursively into the BST maintaining BST property.\n3. Perform depth-first in-order traversal: recurse left, visit node, recurse right.',
        JSON.stringify(['c', 'cpp', 'java', 'python']),
        'c',
        JSON.stringify(exp2StarterCodes),
        JSON.stringify(exp2TestCases),
        10,
        '2026-12-05',
        new Date().toISOString()
    );

    // Practical 3: SQL Relational Queries
    const exp3StarterCodes = {
        sql: `-- Schema:
-- STUDENTS (id INT, name TEXT, gpa REAL, dept_id INT);
-- DEPARTMENTS (id INT, dept_name TEXT, hod TEXT);

-- TASK: Write a query to find the department name, total students, and average GPA
-- for departments that have more than 1 student enrolled, ordered by average GPA descending.

SELECT 
    d.dept_name, 
    COUNT(s.id) AS total_students, 
    ROUND(AVG(s.gpa), 2) AS avg_gpa
FROM DEPARTMENTS d
JOIN STUDENTS s ON d.id = s.dept_id
GROUP BY d.id, d.dept_name
HAVING COUNT(s.id) > 1
ORDER BY avg_gpa DESC;`
    };

    const exp3TestCases = [
        { id: 'tc1', input: '', expected_output: 'Computer Engineering|3|3.87\nElectronics & Telecomm|2|3.45', is_hidden: false, explanation: 'Aggregates department-wise GPA and counts' }
    ];

    insertPractical.run(
        'prac-3',
        'sub-2',
        1,
        'Relational Joins, Group By, and Aggregations on University Database',
        'To formulate complex SQL multi-table joins, aggregate functions (COUNT, AVG), and HAVING clauses to extract department performance metrics.',
        'Relational algebra joins allow relational tables to be normalized to 3NF/BCNF while enabling rich dimensional reporting via equi-joins, group-by partitions, and filter constraints.',
        '1. Perform an INNER JOIN between DEPARTMENTS and STUDENTS.\n2. Group records by Department ID.\n3. Compute aggregate COUNT(s.id) and AVG(s.gpa).\n4. Filter groups having COUNT > 1.\n5. Sort descending by computed GPA.',
        JSON.stringify(['sql']),
        'sql',
        JSON.stringify(exp3StarterCodes),
        JSON.stringify(exp3TestCases),
        10,
        '2026-11-20',
        new Date().toISOString()
    );

    // Practical 4: Operating Systems CPU Scheduling / IPC
    const exp4StarterCodes = {
        c: `#include <stdio.h>

int main() {
    int n = 3;
    int bt[] = {5, 3, 8}; // Burst times
    int wt[3] = {0}, tat[3] = {0};

    // Calculate waiting time
    wt[0] = 0;
    for (int i = 1; i < n; i++) {
        wt[i] = wt[i-1] + bt[i-1];
    }

    // Calculate turnaround time
    for (int i = 0; i < n; i++) {
        tat[i] = wt[i] + bt[i];
    }

    printf("PID\\tBT\\tWT\\tTAT\\n");
    for (int i = 0; i < n; i++) {
        printf("P%d\\t%d\\t%d\\t%d\\n", i + 1, bt[i], wt[i], tat[i]);
    }
    return 0;
}`,
        python: `def fcfs_schedule(processes):
    n = len(processes)
    wt = [0] * n
    tat = [0] * n
    
    for i in range(1, n):
        wt[i] = wt[i-1] + processes[i-1][1]
        
    for i in range(n):
        tat[i] = wt[i] + processes[i][1]
        
    print("PID\\tBT\\tWT\\tTAT")
    for i in range(n):
        print(f"{processes[i][0]}\\t{processes[i][1]}\\t{wt[i]}\\t{tat[i]}")

if __name__ == '__main__':
    procs = [("P1", 5), ("P2", 3), ("P3", 8)]
    fcfs_schedule(procs)`
    };

    insertPractical.run(
        'prac-4',
        'sub-3',
        1,
        'First-Come First-Served (FCFS) CPU Scheduling Simulation',
        'To implement the FCFS CPU scheduling algorithm and compute Waiting Time (WT) and Turnaround Time (TAT) for a queue of incoming tasks.',
        'FCFS is a non-preemptive scheduling policy. Jobs are executed in strict arrival order, demonstrating the convoy effect when a CPU-bound process precedes I/O-bound tasks.',
        '1. Initialize total waiting time to 0.\n2. For first process, WT = 0.\n3. For each subsequent process i, WT[i] = WT[i-1] + BT[i-1].\n4. TAT[i] = WT[i] + BT[i].\n5. Output process schedule table.',
        JSON.stringify(['c', 'cpp', 'python', 'java']),
        'c',
        JSON.stringify(exp4StarterCodes),
        JSON.stringify([{ id: 'tc1', input: '', expected_output: 'PID\tBT\tWT\tTAT\nP1\t5\t0\t5\nP2\t3\t5\t8\nP3\t8\t8\t16', is_hidden: false, explanation: 'FCFS timeline' }]),
        10,
        '2026-11-15',
        new Date().toISOString()
    );

    // Insert Live Lab Session (Active RIGHT NOW during lab lecture!)
    const insertSession = db.prepare(`
    INSERT INTO live_sessions (id, session_code, subject_id, teacher_id, lab_room, batch, active_practical_id, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const now = new Date();
    const labStart = new Date(now.getTime() - 45 * 60 * 1000).toISOString(); // started 45 mins ago
    const labEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString();   // 75 mins remaining

    insertSession.run(
        'sess-1',
        'LAB-CS-304',
        'sub-1',
        'teacher-1',
        'Lab Hall 304 (Turing Computing Lab)',
        'Batch A1',
        'prac-1',
        labStart,
        labEnd,
        'active',
        new Date().toISOString()
    );

    // Insert Submissions for Student-1 (Aarav Mehta)
    // One Already Verified & Done (Exp 3 SQL: 10/10 with Teacher Digital Signature & Verification Hash)
    // One Current / In Progress (Exp 1: Active in current live session!)
    // One Pending (Exp 2: Not yet submitted)
    const insertSub = db.prepare(`
    INSERT INTO submissions (id, practical_id, student_id, student_personal_id, session_id, language, code, last_output, test_results, status, simultaneous_proof, marks_obtained, max_marks, teacher_remarks, teacher_signature, verified_at, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const verifiedProof = {
        session_code: 'LAB-CS-201',
        lab_room: 'Database Systems Lab (Room 202)',
        joined_at: '2026-11-20T10:02:14Z',
        submission_time: '2026-11-20T11:42:30Z',
        run_count: 8,
        keystrokes: 420,
        live_verified: true,
        verification_hash: 'SHA256:7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
        tamper_proof_seal: 'OFFICIAL_DIGITAL_VERIFICATION_STAMP_SIGNED_DR_ANITA'
    };

    insertSub.run(
        'sub-record-1',
        'prac-3',
        'student-1',
        '2023-CS-042',
        null,
        'sql',
        exp3StarterCodes.sql,
        'dept_name | total_students | avg_gpa\nComputer Engineering | 3 | 3.87\nElectronics & Telecomm | 2 | 3.45',
        JSON.stringify([{ id: 'tc1', passed: true, actual: 'Computer Engineering|3|3.87\nElectronics & Telecomm|2|3.45' }]),
        'verified',
        JSON.stringify(verifiedProof),
        10.0,
        10.0,
        'Excellent query formatting and correct use of HAVING clause with aggregate grouping. Verified live in Room 202.',
        'Prof. Anita Deshmukh (Digital Sign Token: ANITA_DESHMUKH_KEY_9831)',
        '2026-11-20T11:45:00Z',
        '2026-11-20T11:42:30Z',
        '2026-11-20T10:02:14Z'
    );

    // Student-1 Current In-Progress for Exp 1 in Live Session
    const liveProof = {
        session_code: 'LAB-CS-304',
        lab_room: 'Lab Hall 304 (Turing Computing Lab)',
        joined_at: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
        last_run_at: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        run_count: 5,
        keystrokes: 680,
        live_verified: false,
        session_active: true
    };

    insertSub.run(
        'sub-record-2',
        'prac-1',
        'student-1',
        '2023-CS-042',
        'sess-1',
        'cpp',
        exp1StarterCodes.cpp,
        'BALANCED\n[Execution time: 14ms | Memory: 3.2MB | Exit Code: 0]',
        JSON.stringify([
            { id: 'tc1', passed: true, actual: 'BALANCED' },
            { id: 'tc2', passed: true, actual: 'NOT BALANCED' }
        ]),
        'in_progress',
        JSON.stringify(liveProof),
        null,
        10.0,
        null,
        null,
        null,
        new Date().toISOString(),
        new Date(now.getTime() - 40 * 60 * 1000).toISOString()
    );

    // Insert Telemetry for Student 1 and Student 2 in Live Session
    const insertTelemetry = db.prepare(`
    INSERT INTO live_telemetry (student_id, session_id, practical_id, current_language, keystrokes_count, run_count, tests_passed, tests_total, status_label, last_heartbeat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertTelemetry.run('student-1', 'sess-1', 'prac-1', 'cpp', 680, 5, 2, 4, 'Testing Hidden Cases', new Date().toISOString());
    insertTelemetry.run('student-2', 'sess-1', 'prac-1', 'python', 510, 3, 2, 4, 'Writing Stack Class', new Date().toISOString());
    insertTelemetry.run('student-3', 'sess-1', 'prac-1', 'c', 890, 7, 4, 4, 'Ready for Teacher Signoff', new Date().toISOString());

    // Insert Assignments
    const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, subject_id, title, description, category, due_date, max_marks, supported_languages, starter_code, test_cases, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertAssignment.run(
        'assign-1',
        'sub-1',
        'Design and Implementation of LRU Cache with O(1) Get & Put',
        'Implement a Least Recently Used (LRU) Cache capacity constraint data structure using a combination of a Hash Map and a Doubly Linked List. All get and put operations must run in strict O(1) average time complexity.',
        'Coding Problem',
        '2026-11-30',
        20,
        JSON.stringify(['cpp', 'python', 'java']),
        `// LRU Cache template
class LRUCache {
public:
    LRUCache(int capacity) {
        // Initialize capacity and structures
    }
    
    int get(int key) {
        return -1;
    }
    
    void put(int key, int value) {
        // Insert or update key
    }
};`,
        JSON.stringify([{ id: 'atc1', input: 'cap: 2, put(1,1), put(2,2), get(1), put(3,3), get(2)', expected_output: '1, -1', is_hidden: false }]),
        new Date().toISOString()
    );

    insertAssignment.run(
        'assign-2',
        'sub-2',
        'Third Normal Form (3NF) and BCNF Schema Decomposition Analysis',
        'Analyze the given schema with functional dependencies R(A, B, C, D, E) with F = {A -> BC, CD -> E, B -> D, E -> A}. Find all candidate keys, verify whether the schema is in 3NF and BCNF, and provide lossless join decomposition.',
        'Theory & Analysis',
        '2026-12-08',
        20,
        JSON.stringify(['text', 'sql']),
        `-- Enter your formal candidate key analysis and decomposition steps below:
-- Candidate Keys:
-- 3NF Violations:
-- BCNF Violations:
-- Lossless Join Decomposition tables:`,
        null,
        new Date().toISOString()
    );

    insertAssignment.run(
        'assign-3',
        'sub-3',
        'Multi-threaded Producer-Consumer with Semaphores and Mutex Locks',
        'Implement the classic Producer-Consumer bounded-buffer synchronization problem using POSIX threads, semaphores (sem_wait, sem_post), and pthread mutexes to prevent race conditions and deadlocks.',
        'Coding Problem',
        '2026-12-12',
        25,
        JSON.stringify(['c', 'cpp', 'python']),
        `#include <stdio.h>
#include <pthread.h>
#include <semaphore.h>

#define BUFFER_SIZE 5
int buffer[BUFFER_SIZE];
int in = 0, out = 0;

sem_t empty;
sem_t full;
pthread_mutex_t mutex;

void* producer(void* arg) {
    // Producer logic
    return NULL;
}

void* consumer(void* arg) {
    // Consumer logic
    return NULL;
}

int main() {
    // Initialize semaphores and spawn threads
    return 0;
}`,
        null,
        new Date().toISOString()
    );

    // Student 1 assignment submission (Submitted Assign 1)
    const insertAssignSub = db.prepare(`
    INSERT INTO assignment_submissions (id, assignment_id, student_id, student_personal_id, code, notes, status, marks, feedback, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertAssignSub.run(
        'asub-1',
        'assign-1',
        'student-1',
        '2023-CS-042',
        `// Completed LRU Cache implementation using std::unordered_map and std::list`,
        'Implemented with Doubly Linked list and hash map. Handles all edge cases for capacity 1 and eviction.',
        'graded',
        19.0,
        'Great job! O(1) operations achieved. Clean iterator handling.',
        '2026-11-22T14:30:00Z'
    );
}
