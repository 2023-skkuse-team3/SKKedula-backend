const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();
const db = new sqlite3.Database("skkedula-v3.db"); // 데이터베이스 연결

// body-parser 미들웨어 사용
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// session 사용
const session = require("express-session");
app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

/*커스텀 과목 추가*/
app.post('/custom-courses', (req, res) => {
  const { user_id, course_name, Time, Room_num } = req.body;
  
  // courses 테이블에 데이터 추가
  const insertCourseQuery = `INSERT INTO CustomCourses (course_name, user_id, time, room_num) VALUES (?, ?, ?, ?)`;
  db.run(insertCourseQuery, [course_name, user_id, Time, Room_num], function(err) {
      if (err) {
          return console.error(err.message);
      }
      console.log(`A row has been inserted with rowid ${this.lastID}`);
      const newCourseId = this.lastID;
      // Enrollments 테이블에 데이터 추가
      const insertEnrollmentQuery = `INSERT INTO Enrollments (Student_ID, Course_ID) VALUES (?, ?)`;
      db.run(insertEnrollmentQuery, [user_id, "custom_"+newCourseId], function(err) {
          if (err) {
              return console.error(err.message);
          }
          console.log(`Enrollment created with rowid ${this.lastID}`);
          res.status(200).send(`Course and enrollment created successfully!`);
      });
  });
});
/* 커스텀 일정 조회 API*/
app.get('/custom-courses', (req, res) => {
  // 사용자 ID 쿼리 파라미터 받기
  const { user_id } = req.body;

  // 입력받은 사용자 ID를 사용하여 해당 사용자의 일정만 조회
  const query = `SELECT * FROM CustomCourses WHERE user_id = ?`;

  db.all(query, [user_id], (err, rows) => {
      if (err) {
          res.status(500).send(err.message);
          return;
      }
      res.status(200).json(rows);
  });
});

//* 클라이언트가 유저아이디전송-> 수강 과목 정보 조회*/
app.post("/timetables/courses", (req, res) => {
  const userID = req.body.userID; // 클라이언트에서 사용자 ID를 받기
  //const userID = 1

  db.all(
    "SELECT * FROM Enrollments WHERE Student_ID = ?",
    [userID],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const courseIDs = rows.map((row) => row.Course_ID);
      const query = `SELECT * FROM Courses WHERE Course_ID IN (${courseIDs
        .map(() => "?")
        .join(",")})`;

      db.all(query, courseIDs, (err, courseDetails) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        //console.log(courseDetails);

        res.json(courseDetails);
      });
    }
  );
});

/** 학수번호에 해당하는 과목 삭제 */
app.post("/timetables/courses", (req, res) => {
  const { user_id, course_id } = req.body;

  db.run(
    "DELETE FROM Enrollments WHERE Student_ID = ? AND Course_ID = ?",
    [user_id, course_id],
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error deleting enrollment");
        return;
      }
      res.send(
        `Enrollment with Student_ID ${user_id} and Course_ID ${course_id} deleted successfully`
      );
    }
  );
});

/* 유저아이디, 학수번호 전송 -> 수강 과목 정보 조회 */
// 사용자 입력 from, to JSON 데이터를 가정
// 입력형식; const input = { "from": "eiwe-45", "to": "323DDex" };

app.post("/timetables/fromto-infos", (req, res) => {
  const { from, to } = req.body;
  let courseData = [];

  db.get("SELECT * FROM Courses WHERE Course_ID = ?", from, (err, fromRow) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching data");
      return;
    }

    db.get("SELECT * FROM Courses WHERE Course_ID = ?", to, (err, toRow) => {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error fetching data");
        return;
      }

      if (fromRow) {
        courseData.push(fromRow);
      }
      if (toRow) {
        courseData.push(toRow);
      }

      res.json(courseData);
    });
  });
});

// Courses를 JSON으로 반환하는 엔드포인트
app.get("/courses", (req, res) => {
  db.all("SELECT * FROM Courses", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ courses: rows }); // courses 테이블의 내용을 JSON으로 반환
  });
});

app.post("/reset-timetables", (req, res) => {
  const userId = req.body.user_id; // 클라이언트로부터 User_ID를 받기

  // Enrollments 테이블에서 해당 User_ID를 가진 학생의 모든 수강 정보를 삭제
  const query = `
      DELETE FROM Enrollments
      WHERE Student_ID IN (
        SELECT ID FROM Students WHERE User_ID = ?
      )`;

  db.run(query, [userId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
    } else {
      res.send({
        message: "시간표가 초기화되었습니다.",
        affectedRows: this.changes,
      });
    }
  });
});

//-----------------------------shim code--------------------------------------

// 회원가입
app.post("/register", (req, res) => {
  const { user_id, name, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      return res.status(500).json({ message: "비밀번호 해싱 오류" });
    }

    db.run(
      "INSERT INTO Students (User_ID, Name, PW) VALUES (?, ?, ?)",
      [user_id, name, hash],
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
  const { user_id, password } = req.body;

  db.get(
    "SELECT PW FROM Students WHERE User_ID = ?",
    [user_id],
    function (err, row) {
      if (err) {
        return res.status(500).json({ message: "로그인 실패" });
      }

      if (!row) {
        return res.status(404).json({ message: "존재하지 않는 사용자입니다." });
      }

      bcrypt.compare(password, row.PW, function (err, result) {
        if (err) {
          return res.status(500).json({ message: "비밀번호 검증 오류" });
        }

        if (result) {
          req.session.userId = user_id;
          res.json({ message: "로그인 성공" });
        } else {
          res.status(401).json({ message: "로그인 실패" });
        }
      });
    }
  );
});

// 로그아웃
app.get("/logout", (req, res) => {
  if (req.session && req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 실패" });
      }
      res.json({ message: "로그아웃 성공" });
    });
  } else {
    res.status(400).json({ message: "로그인 상태가 아닙니다." });
  }
});

// =======================================================================================================
// =========================================강의실 정보+학습공간============================================
// 유저가 지정한 빌딩 번호 또는 이름으로 위치 조회
app.post("/search/building", (req, res) => {
  const { Building_num, Building_name, Room_num } = req.body;

  let query = "";
  let params = [];

  if (Building_num) {
      query = "SELECT Building_name, Latitude, Longitude FROM Building WHERE Building_num = ?";
      params = [Building_num];
  } else if (Building_name) {
      query = "SELECT Building_name, Latitude, Longitude FROM Building WHERE Building_name LIKE ?";
      params = [`%${Building_name}%`];
  } else if (Room_num) {
      query = "SELECT Room_num, Latitude, Longitude FROM Classrooms WHERE Room_num = ?";
      params = [Room_num];
  } else {
      return res.status(400).json({ message: "Building_num, Building_name 또는 Room_num을 제공해주세요." });
  }

  db.get(query, params, (err, row) => {
      if (err) {
        console.error(err); // 오류 출력
          return res.status(500).json({ message: "데이터 로딩 실패" });
      }
      if (!row) {
          return res.status(404).json({ message: "검색 결과가 없습니다." });
      }
      res.json(row);
  });
});

//학습공간 버튼 클릭시 정보 제공
app.get("/studyspaces", (req, res) => {
  const query = "SELECT * FROM Studyspaces";

  db.all(query, [], (err, rows) => {
      if (err) {
          return res.status(500).json({ message: "데이터 로딩 실패" });
      }
      if (rows.length === 0) {
          return res.status(404).json({ message: "학습 공간이 없습니다." });
      }
      res.json(rows);
  });
});

// =========================================강의실 정보+학습공간============================================

//---------------------------------------------------- userpath -------------------------------------------------------
// user가 설정한 경로 좌표 저장
app.post("/savepath", (req, res) => {
  const {
    ID,
    Sequence,
    Stopover_count,
    Start_latitude,
    Start_longitude,
    End_latitude,
    End_longitude,
    Stopover,
  } = req.body;

  // 경로 데이터 유효성 검사
  if (
    !ID ||
    !Sequence ||
    !Start_latitude ||
    !Start_longitude ||
    !End_latitude ||
    !End_longitude ||
    !Stopover ||
    isNaN(Sequence) ||
    isNaN(Stopover_count)
  ) {
    return res
      .status(400)
      .json({ message: "입력 데이터가 유효하지 않습니다." });
  }

  db.run(
    "INSERT INTO Userpath (ID, Sequence, Stopover_count, Start_latitude, Start_longitude, End_latitude, End_longitude, Stopover) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      ID,
      Sequence,
      Stopover_count,
      Start_latitude,
      Start_longitude,
      End_latitude,
      End_longitude,
      Stopover,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "경로 저장 오류" });
      }
      res.json({ message: "경로가 정상적으로 저장되었습니다." });
    }
  );
});

// user가 설정한 경로 삭제
app.delete("/deletepath", (req, res) => {
  const { ID, Sequence } = req.body;

  db.run(
    "DELETE FROM Userpath WHERE ID = ? AND Sequence = ?",
    [ID, Sequence],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "경로 삭제 오류" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "경로를 찾을 수 없습니다." });
      }
      res.json({ message: "경로가 성공적으로 삭제되었습니다." });
    }
  );
});

// user ID와 저장경로순서번호를 받아서 경로 좌표 조회
app.post("/getpath", (req, res) => {
  const { ID, Sequence } = req.body;

  db.get(
    "SELECT * FROM Userpath WHERE ID = ? AND Sequence = ?",
    [ID, Sequence],
    (err, row) => {
      if (err) {
        res.status(500).json({ message: "데이터 로딩 실패" });
        return;
      }
      if (!row) {
        res.status(404).json({ message: "해당 경로를 찾을 수 없습니다." });
      } else {
        res.json(row);
      }
    }
  );
});
//-------------------------------------------------------------------------------------
//과목 추가, (front에서 data 입력 -> db에 추가)
// course_name을 유저가 검색해서 자기가 맞는 과목을 넣을 때 course_name이 여러개일 경우..

app.post("/timetable/add", (req, res) => {
  const course_name = req.body.course_name;
  const userID = req.body.userID;
  // userID = 1
  console.log(course_name);
  // 과목을 courses 테이블에서 찾습니다.
  const selectCourseQuery = `
      SELECT *
      FROM Courses
      WHERE Course_name = ?
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
        courseData: courseData,
      });
    } else {
      // 단일 과목인 경우
      // 찾은 과목을 timetable 테이블에 추가합니다.
      const course_id = courseData[0].course_ID;
      const insertTimetableQuery = `
          INSERT INTO Enrollments (student_ID , course_ID)
          VALUES (?, ?)
        `;

      db.run(insertTimetableQuery, [userID, course_id], (err) => {
        if (err) {
          return res.status(500).json({ message: "과목 추가 실패" });
        }

        res.json({
          message: "과목이 성공적으로 추가되었습니다.",
          courseData: courseData,
        });
      });
    }
  });
});

//course_name이 여러개여서 클라이언트 한테 요청을 보내고 fetch로 다시 돌아온다.
//그 selectedcourse를 db에 저장하는데 여기서 customdata 저장하는 것도 이 app.post를 사용해도 괜찮을거 같다.
//custom data를 받을 경우에는 유저가 직접 course_name, class_time, class_room 같은 내용을 직접 입력하는 란이 있다면.
app.post("/timetable/addSelectedCourse", (req, res) => {
  const { userID, course_ID } = req.body;
  const insertQuery = `
      INSERT INTO Enrollments (student_ID , course_ID)
      VALUES (?, ?)
    `;

  db.run(insertQuery, [userID, course_ID], function (err) {
    if (err) {
      return res.status(500).json({ message: "과목 추가 실패" });
    }

    res.json({ message: "과목이 성공적으로 추가되었습니다." });
  });
});

app.post("/timetable/searchByCourse", (req, res) => {
  const course_name = req.body.course_name;

  const selectQuery = `
    SELECT *
    FROM courses  
    WHERE course_name LIKE ?;  
  `;

  const searchPattern = `%${course_name}%`;

  db.all(selectQuery, [searchPattern], (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "과목 검색 실패", error: err.message });
    }

    res.json(data);
  });
});

app.post("/timetable/searchByProfessor", (req, res) => {
  const professor = req.body.professor;

  const selectQuery = `
    SELECT *
    FROM courses  
    WHERE Professor LIKE ?;  
  `;

  const searchPattern = `%${professor}%`;

  db.all(selectQuery, [searchPattern], (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "과목 검색 실패", error: err.message });
    }

    res.json(data);
  });
});

//   app.get('/update-data', (req, res) => {
//     const sql = `UPDATE Courses
//                  SET Room_num = CAST(Room_num AS INTEGER)
//                  WHERE Room_num LIKE '%.0'`;

//     db.run(sql, [], (err) => {
//       if (err) {
//         return console.error(err.message);
//       }
//       res.send('Data updated successfully');
//     });
//   });

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// // POST로 최종과목(중복과목중 사용자가 선택한 최종시간표) JSON 데이터 수신 및 데이터베이스에 삽입
// app.post("/timetables/courses", (req, res) => {

//     //const user_data = req.body;

//     user_data.forEach((item) => {
//         const {
//           Course_name,
//           Professor,
//           Day,
//           Hour,
//           Room_num,
//           now_year,
//           now_semester,
//         } = item;

//         // db.run(
//         //   `INSERT INTO your_table (Course_name, Professor, Day, Hour, Room_num, Year, Semester) VALUES (?, ?, ?, ?, ?, ?, ?)`,
//         //   [Course_name, Professor, Day, Hour, Room_num, now_year, now_semester],
//         //   function (err) {
//         //     if (err) {
//         //       return console.error("데이터 삽입 오류:", err.message);
//         //     }
//         //     console.log(`강의 데이터 삽입 완료: ${Course_name}`);
//         //   }
//         // );
//     });

//     // 데이터베이스 연결 닫기
//     // db.close((err) => {
//     //     if (err) {
//     //       return console.error("데이터베이스 연결 종료 오류:", err.message);
//     //     }
//     //     console.log("데이터베이스 연결이 닫혔습니다.");
//     // });

// });
