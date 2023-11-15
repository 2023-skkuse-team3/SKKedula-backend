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
// 유저가 지정한 강의실 정보를 받아 위치 조회
app.post("/bins", (req, res) => {
    const Building_num = req.body.Building_num;
    const Room_num = req.body.Room_num;

    if (!Building_num || !Room_num) {
        return res.status(400).json({ message: "건물 번호와 강의실 번호를 모두 제공해주세요." });
    }

    db.get("SELECT Latitude, Longitude FROM Classrooms WHERE Building_num = ? AND Room_Num = ?", [Building_num, Room_num], (err, row) => {
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
    const Building_num = req.body.Building_num;

    if (!Building_num) {
        return res.status(400).json({ message: "건물 번호를 제공해주세요." });
    }

    db.get("SELECT Latitude, Longitude FROM Buildings WHERE Building_num = ?", [Building_num], (err, row) => {
        if (err) {
            return res.status(500).json({ message: "데이터 로딩 실패" });
        }
        if (!row) {
            return res.status(404).json({ message: "해당 건물을 찾을 수 없습니다." });
        }
        res.json(row);
    });
});

app.post("/add_study_space", (req, res) => {
    const { Name, Building_num, Latitude, Longitude, Floor } = req.body;

    db.run(
      "INSERT INTO Studyspaces (Name, Building_num, Latitude, Longitude, Floor) VALUES (?, ?, ?, ?, ?)",
      [Name, Building_num, Latitude, Longitude, Floor],
      function (err) {
        if (err) {
          return res.status(500).json({ message: "학습 공간 등록 오류" });
        }
        res.json({ message: "학습 공간이 정상적으로 등록되었습니다." });
      }
    );
});

app.get("/study_spaces_in_building", (req, res) => {
    const Building_num = req.query.Building_num;

    if (!Building_num) {
        return res.status(400).json({ message: "건물 번호를 제공해주세요." });
    }

    db.all("SELECT * FROM Studyspaces WHERE Building_num = ?", [Building_num], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "데이터 로딩 실패" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "해당 건물에 학습 공간이 없습니다." });
        }
        res.json(rows);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});