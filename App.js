// 설치 목록
// npm install express sqlite3 bcrypt body-parser

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const db = new sqlite3.Database("./skkedula.db");
app.use(bodyParser.json());

app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

const saltRounds = 10;

// 회원가입
app.post("/register", (req, res) => {
  const { id, name, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  db.get("SELECT ID FROM Students WHERE ID = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "DB 조회 오류" });
    }

    if (row) {
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }

    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) {
        return res.status(500).json({ message: "비밀번호 해싱 오류" });
      }

      db.run(
        "INSERT INTO Students (ID, Name, PW) VALUES (?, ?, ?)",
        [id, name, hash],
        function (err) {
          if (err) {
            return res.status(500).json({ message: "유저 등록 오류" });
          }
          res.json({ message: "회원가입이 정상적으로 완료되었습니다." });
        }
      );
    });
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
        return res.status(500).json({ message: "비밀번호 비교 오류" });
      }

      if (result) {
        req.session.userId = id;
        res.json({ message: "로그인 성공" });
      } else {
        res.status(401).json({ message: "로그인 실패" });
      }
    });
  });
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
