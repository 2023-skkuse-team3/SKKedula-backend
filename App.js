// 설치 목록
// npm install express sqlite3 bcrypt body-parser

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
import SocketIO from "socket.io";

const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("./skkedula.db");
app.use(bodyParser.json());

const saltRounds = 10;

const database = [
  {
    'Course Name': '심층신경망개론\nIntroduction to Deep Neural Networks',
    'Professor': '이지형',
    'Class Time': '월10:30-11:45&#8203;``【oaicite:1】``&#8203;,수09:00-10:15&#8203;``【oaicite:0】``&#8203;',
    'Class Room': '26223.0'
  },
];

// const createTableQuery = `
//   CREATE TABLE IF NOT EXISTS timetable (
//     enrollment_number INTEGER PRIMARY KEY AUTOINCREMENT,
//     course_name TEXT,
//     professor TEXT,
//     class_time TEXT,
//     class_room TEXT
//   )
// `;


// 회원가입
app.post("/register", (req, res) => {
  const { student_ID, name, id, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      return res.status(500).json({ message: "비밀번호 해싱 오류" });
    }

    db.run(
      "INSERT INTO Students (Student_ID, Name, ID, PW) VALUES (?, ?, ?, ?)",
      [student_ID, name, id, hash],
      function (err) {
        if (err) {
          return res.status(500).json({ message: "유저 등록 오류" });
        }
        res.json({ message: "회원가입이 정상적으로 완료되었습니다." });
      }
    );
  });
});

// 로그인
app.post("/login", (req, res) => {
  const { id, password } = req.body;

  db.get("SELECT PW FROM Students WHERE ID = ?", [id], function (err, row) {
    if (err) {
      return res.status(500).json({ message: "로그인 실패" });
    }

    if (!row) {
      return res.status(404).json({ message: "존재하지 않는 사용자입니다." });
    }

    bcrypt.compare(password, row.PW, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ message: "비밀번호가 일치하지 않습니다." });
      }

      if (result) {
        res.json({ message: "로그인 성공" });
      } else {
        res.status(401).json({ message: "로그인 실패" });
      }
    });
  });
});

// =======================================================================================================

//과목 삭제, (front에서 요청이 옴 -> db에서 삭제)
app.delete("/timetable/delete", (req, res) => {
  const {course_name, professor, class_time, class_room } = req.body; // 

  // DELETE 쿼리를 실행하여 데이터베이스에서 해당 과목 삭제
  const deleteQuery = `
    DELETE FROM timetable
    WHERE course_name = ? 
    AND professor = ? 
    AND class_time = ? 
    AND class_room = ?`;

  db.run(deleteQuery, [course_name, professor, class_time, class_room], function (err) {
    if (err) {
      return res.status(500).json({ message: "과목 삭제 실패" });
    }

    if (this.changes > 0) {
      res.json({ message: "과목이 삭제되었습니다." }); //db에 변경이 있을 경우 this.changes가 0보다 커진다. 따라서 삭제 된 걸 확인 할 수 있다.
    } else {
      res.status(404).json({ message: "과목을 찾을 수 없습니다." });
    }
  });
});


//과목 추가, (front에서 data 입력 -> db에 추가) 
// course_name을 유저가 검색해서 자기가 맞는 과목을 넣을 때 course_name이 여러개일 경우..
app.post("/timetable/add", (req, res) => {
  const { course_name } = req.body;

  // 과목을 courses 테이블에서 찾습니다.
  const selectCourseQuery = `
    SELECT *
    FROM courses
    WHERE course_name = ?
  `;

  db.all(selectCourseQuery, [course_name], (err, courseData) => {
    if (err) {
      return res.status(500).json({ message: "과목 조회 실패" });
    }

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ message: "과목을 찾을 수 없음" });
    }

    // 만약 course_name이 여러 개일 경우
    if (courseData.length > 1) {
      res.json({
        message: "동일한 과목이 여러 개 있습니다. 선택해 주세요.",
        courseData: courseData
      });
    } else {
      // 단일 과목인 경우
      const { course_name, professor, class_time, class_room } = selectedCourse;

      // 찾은 과목을 timetable 테이블에 추가합니다.
      const insertTimetableQuery = `
        INSERT INTO timetable (course_name, professor, class_time, class_room)
        VALUES (?, ?, ?, ?)
      `;

      db.run(insertTimetableQuery, [course_name, professor, class_time, class_room], (err) => {
        if (err) {
          return res.status(500).json({ message: "과목 추가 실패" });
        }

        res.json({
          message: "과목이 성공적으로 추가되었습니다.",
          courseData: selectedCourse
        });
      });
    }
  });
});

//course_name이 여러개여서 클라이언트 한테 요청을 보내고 fetch로 다시 돌아온다.
//그 selectedcourse를 db에 저장하는데 여기서 customdata 저장하는 것도 이 app.post를 사용해도 괜찮을거 같다.
//custom data를 받을 경우에는 유저가 직접 course_name, class_time, class_room 같은 내용을 직접 입력하는 란이 있다면.
app.post("/timetable/addSelectedCourse", (req, res) => {
  const {
    course_name,
    professor,
    class_time,
    class_room
  } = req.body;

  const insertQuery = `
    INSERT INTO timetable (course_name, professor, class_time, class_room)
    VALUES (?, ?, ?, ?)
  `;

  db.run(
    insertQuery,
    [course_name, professor, class_time, class_room],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "과목 추가 실패" });
      }

      res.json({ message: "과목이 성공적으로 추가되었습니다." });
    }
  );
});


app.patch("/timetable/edit", (req, res) => {
  const updatedData = req.body;
  const courseName = updatedData.course_name;
  const classTime = updatedData.class_time;

  const updateQuery = `
    UPDATE timetable
    SET professor = ?,
        class_room = ?
    WHERE course_name = ? AND class_time = ?;
  `;

  db.run(
    updateQuery,
    [updatedData.professor, updatedData.class_room, courseName, classTime],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "과목 업데이트 실패" });
      }

      res.json({ message: "과목이 성공적으로 업데이트되었습니다." });
    }
  );
});


//출발지 도착지 클릭시 과목별 정보 조회 -> 클릭하면 backend에는 어떤 data 값?
//일단 출발지만 만들어봄. 고민.
app.get("/timetable/infoDeparture", (req, res) => {
  const departure = req.query; 


  const selectQuery = `
    SELECT *
    FROM timetable
    WHERE ( ? )
  `;
  //여긴 어디서 data 가져와야는지.
  db.all( //결과 반환
    selectQuery,
    departure,
    (err, data) => {
      if (err) {
        return res.status(500).json({ message: "과목 정보 조회 실패" });
      }

      res.json(data); //도착지 정보 front에 반환
    }
  );
});

//과목 조회 -> 교수명으로 조회 기능 추가?
app.get("/timetable/search", (req, res) => {
  const searchQuery = req.query.searchQuery; 
  //http://example.com/timetable/search?searchQuery=과목명 만약에 클라이언트에서 이런식으로 data가 들어오면 이런 방법을 쓴다.

  const selectQuery = `
    SELECT *
    FROM courses  
    WHERE course_name LIKE ?;
  `;
  //여긴 From courses
  const searchPattern = `%${searchQuery}%`; // LIKE 연산자를 활용하기 위해서 사용.

  db.all(
    selectQuery,
    [searchPattern],
    (err, data) => {
      if (err) {
        return res.status(500).json({ message: "과목 검색 실패" });
      }

      res.json(data); //도착지 정보 front에 반환
    }
  );
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
