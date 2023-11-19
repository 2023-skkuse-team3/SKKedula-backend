const sqlite3 = require('sqlite3').verbose();

// SQLite DB 파일 연결 (없으면 새로 생성)

const db = new sqlite3.Database("SKKedula-backend/skkedula-v3.db"); // 데이터베이스 연결

db.run(`DROP TABLE IF EXISTS CustomCourses;`)
// courses 테이블 생성
db.run(`
CREATE TABLE IF NOT EXISTS CustomCourses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    time TEXT NOT NULL,
    room_num INTEGER NOT NULL,
    Year INTEGER DEFAULT 2023,
    Semester INTEGER DEFAULT 2
);
`, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("CustomCourses table created successfully.");
    }
});

// 연결 종료
db.close((err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Closed the database connection.');
    }
});
