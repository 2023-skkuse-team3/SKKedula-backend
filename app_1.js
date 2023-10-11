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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
