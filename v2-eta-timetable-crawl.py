from fastapi import FastAPI
from selenium import webdriver
from bs4 import BeautifulSoup
from pydantic import BaseModel

app = FastAPI()
from selenium import webdriver
import pandas as pd
import sqlite3


# Pydantic 모델 정의
class CourseRequest(BaseModel):
    url: str
    user_id: str


# GET 요청을 처리하는 엔드포인트
@app.get("/")
async def read_root():
    return {"message": "8000포트 테스트 코드 입니다."}


@app.post("/scrape_course_info")
async def scrape_course_info(request_data: CourseRequest):
    user_id = request_data.user_id
    options = webdriver.ChromeOptions()
    options.add_argument("headless")
    options.add_argument("no-sandbox")
    options.add_argument("--disable-gpu")  # GPU 사용 비활성화

    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "user-agent={Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36}"
    )

    # 웹 드라이버 설정
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(3)

    # 웹 페이지 열기
    driver.get(request_data.url)

    # 페이지의 HTML 가져오기
    html = driver.page_source

    # 웹 드라이버 종료
    driver.quit()

    # 과목 정보를 저장
    subject_info_map = {}

    # HTML 파싱
    soup = BeautifulSoup(html, "html.parser")
    subject_divs = soup.find_all(
        "div", class_=lambda value: value and value.startswith("subject")
    )

    # 각 과목 정보 파싱
    for index, div in enumerate(subject_divs, start=1):
        h3_tag = div.find("h3")
        em_tag = div.find("em")
        span_tag = div.find("span")

        subject_name = h3_tag.text if h3_tag else None
        professor_name = em_tag.text if em_tag else None
        classroom = span_tag.text if span_tag and span_tag.text else None

        if classroom is not None:
            subject_info_map[f"Div {index}"] = {
                "course_name": subject_name,
                "professor": professor_name,
                "class_room": classroom,
            }

    # 리턴할 JSON 데이터 초기화
    json_data_list = []

    # SQLite 데이터베이스 연결
    conn = sqlite3.connect("../SKKedula-backend/skkedula-v3.db")

    # SQL 쿼리: Courses 테이블에서 데이터를 불러오는 쿼리
    query = "SELECT * FROM Courses"

    # DataFrame으로 읽어오기
    course_data = pd.read_sql_query(query, conn)

    # 각 Div에 대해 course_data에서 해당 강의 정보 찾기
    for div, course_info in subject_info_map.items():
        course_name = course_info["course_name"]
        professor = course_info["professor"]
        class_room = course_info["class_room"]

        # 해당 강의 정보 찾기
        found_course = course_data[
            (course_data["Professor"] == professor)
            & (course_data["Course_name"].str.contains(course_name))
            & (course_data["Room_num"].str.contains(class_room))
            & course_data["Time"].notnull()
        ]
        found_course = found_course.drop_duplicates(subset=["Time"])

        # 각 행의 데이터를 JSON 형식으로 변환하여 리스트에 추가
        for index, row in found_course.iterrows():
            row_data = row.to_dict()
            json_data_list.append(row_data)

    # 중복 제거
    seen_codes = set()
    unique_json_data_list = []
    for data in json_data_list:
        if data["Course_ID"] not in seen_codes:
            unique_json_data_list.append(data)
            seen_codes.add(data["Course_ID"])

    #    return unique_json_data_list
    print(unique_json_data_list)

    # 데이터베이스에 저장
    cursor = conn.cursor()
    # Enrollments 테이블에 데이터를 삽입하는 SQL 쿼리
    insert_query = """
        INSERT INTO Enrollments (Student_ID, Course_ID)
        SELECT ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM Enrollments WHERE Student_ID = ? AND Course_ID = ?
        )
    """

    try:
        # 각 과목에 대해 수강 정보를 Enrollments 테이블에 삽입
        for course in unique_json_data_list:
            print(course["Course_ID"])
            cursor.execute(
                insert_query,
                (user_id, course["Course_ID"], user_id, course["Course_ID"]),
            )  # 예시로 Student_ID를 1로 설정

        # 데이터베이스에 변경사항 저장
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()  # 오류 발생 시 롤백
        conn.close()
        return {"message": "Courses enrolled failed"}

    conn.close()
    return {"message": "Courses enrolled successfully", "data": unique_json_data_list}
