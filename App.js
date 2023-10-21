// 설치 목록
// npm install express sqlite3 bcrypt body-parser

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("./skkedula.db");
app.use(bodyParser.json());

const saltRounds = 10;

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

// 유저가 지정한 강의실 정보를 받아 위치 조회
app.post("/bins", (req, res) => {
  const B_num = req.body.B_num;
  const C_num = req.body.C_num;

  if (!B_num || !C_num) {
    return res.status(400).json({ message: "건물 번호와 강의실 번호를 모두 제공해주세요." });
  }

  db.get("SELECT Latitude, Longitude FROM Classrooms WHERE B_Num = ? AND C_Num = ?", [B_num, C_num], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "데이터 로딩 실패" });
    }
    if (!row) {
      return res.status(404).json({ message: "해당 강의실을 찾을 수 없습니다." });
    }
    res.json(row);
  });
});

// 유저가 지정한 빌딩 번호 정보를 받아 위치 조회
app.post("/bins/building", (req, res) => {
  const B_num = req.body.B_num;

  if (!B_num) {
    return res.status(400).json({ message: "건물 번호를 제공해주세요." });
  }

  db.get("SELECT Latitude, Longitude FROM Buildings WHERE B_Num = ?", [B_num], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "데이터 로딩 실패" });
    }
    if (!row) {
      return res.status(404).json({ message: "해당 건물을 찾을 수 없습니다." });
    }
    res.json(row);
  });
});

// user가 설정한 경로 좌표 저장
app.post("/savepath", (req, res) => {
  const { ID, Sequence, Coornidate_count, Start_latitude, Start_longitude, End_latitude, End_longitude,
    Coordinate1_x, coordinate1_y, Coordinate2_x, coordinate2_y,
    Coordinate3_x, coordinate3_y, Coordinate4_x, coordinate4_y,
    Coordinate5_x, coordinate5_y, Coordinate6_x, coordinate6_y,
    Coordinate7_x, coordinate7_y, Coordinate8_x, coordinate8_y,
    Coordinate9_x, coordinate9_y, Coordinate10_x, coordinate10_y } = req.body;

    const sql = `
    INSERT INTO user_routes (
      ID, Sequence, Coordinate_count, Start_latitude, Start_longitude, 
      End_latitude, End_longitude, 
      Coordinate1_x, Coordinate1_y, Coordinate2_x, Coordinate2_y, 
      Coordinate3_x, Coordinate3_y, Coordinate4_x, Coordinate4_y, 
      Coordinate5_x, Coordinate5_y, Coordinate6_x, Coordinate6_y, 
      Coordinate7_x, Coordinate7_y, Coordinate8_x, Coordinate8_y, 
      Coordinate9_x, Coordinate9_y, Coordinate10_x, Coordinate10_y
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    ID, Sequence, Coordinate_count, Start_latitude, Start_longitude,
    End_latitude, End_longitude,
    Coordinate1_x, Coordinate1_y, Coordinate2_x, Coordinate2_y,
    Coordinate3_x, Coordinate3_y, Coordinate4_x, Coordinate4_y,
    Coordinate5_x, Coordinate5_y, Coordinate6_x, Coordinate6_y,
    Coordinate7_x, Coordinate7_y, Coordinate8_x, Coordinate8_y,
    Coordinate9_x, Coordinate9_y, Coordinate10_x, Coordinate10_y
  ];

  db.run(sql, values, (err) => {
    if (err) {
      res.status(500).json({ error: '경로 저장 오류' });
    } else {
      res.json({ message: '경로 정보가 성공적으로 저장되었습니다.' });
    }
  });

});

// user ID와 저장경로순서번호를 받아서 경로 좌표 조회
app.post("/getpath", (req, res) => {
  const { ID, Sequence } = req.body;

  db.get(
    "SELECT * FROM user_routes WHERE ID = ? AND Sequence = ?", [ID, Sequence], (err, row) => {
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});