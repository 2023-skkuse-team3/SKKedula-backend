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
  
  const placeholders = Array.from({ length: Stopover_count }, (_, i) => `?, ?`).join(', ');

  const sql = `
    INSERT INTO user_routes (
      ID, Sequence, Stopover_count, Start_latitude, Start_longitude, 
      End_latitude, End_longitude, 
      ${placeholders}
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ${placeholders})
  `;

  const values = [
    ID,
    Sequence,
    Stopover_count,
    Start_latitude,
    Start_longitude,
    End_latitude,
    End_longitude,
  ];

  for (const coord of Stopover) {
    values.push(coord.x);
    values.push(coord.y);
  }

  // 남은 좌표에는 null 추가
  const remainingPlaceholders = 10 - Stopover.length;
  for (let i = 0; i < remainingPlaceholders; i++) {
    values.push(null);
    values.push(null);
  }

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