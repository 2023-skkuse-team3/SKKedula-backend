import pandas as pd
import sqlite3

# 데이터베이스에 연결
con = sqlite3.connect("SKKedula-backend/skkedula-v3.db")

# Excel 파일 읽기
df = pd.read_excel("SKKedula-backend/liberal_arts.xlsx")
# 불필요한 컬럼 제거
df = df.drop(columns=["Unnamed: 3"])

# 기존 Courses 테이블에 데이터 추가
df.to_sql("Courses", con, if_exists="append", index=False)

# 연결 종료
con.close()
