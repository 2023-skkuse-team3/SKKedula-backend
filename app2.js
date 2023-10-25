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

app.get("/recommend_study_space", (req, res) => {
    const { currentLat, currentLong } = req.query;

    if (!currentLat || !currentLong) {
        return res.status(400).json({ message: "현재 위치의 위도와 경도를 제공해주세요." });
    }

    // 거리 계산 알고리즘으로 가장 가까운 학습 공간 찾기

    res.json({ message: "추천 학습 공간: [학습 공간 이름]" });
});
