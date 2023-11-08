# SKKedula-backend
# 현정 기록 일지

## 📄 10 04 업데이트
- 에브리타임 , Icampus 과목정보 크롤링 시도 => 보안상 X
- 정보 광장 모든 과목 정보 크롤링 코드 작성
- 모든 과목 CSV 저장 및 회의 & 회의 후 과목 정보 형식 재정리

## 📄 10 11 업데이트
- 에타 시간표 링크에서 유저 시간표 크롤링 코드 구현
- DB 칼럼 형식에 맞추어 데이터 전처리

---
### 💪 11 18 중간-시험기간!
---

## 📄 10 25 업데이트
- 에타 커스텀 시간표도 크롤링 되도록 코드 수정
- 과목정보 같고 날짜만 다른 것을 유저가 선택할 수 있도록 중복 시간표 데이터 모두 수집하도록 수정
- 시간표 데이터 csv,json 형식으로 각각 변환 코드 구현
- 시간표 저장 및 수정 api 구현 (with 심기현 팀원님)
- 시간표 날짜 DB형식으로 수정하는 코드 작성 (1_10301145)
- 깃 코드 업데이트 & 리팩토링 및 정리

#### 📜 10 25 회의
- Course_ID (PK)	Time_start형식 관련 , Time_total (?)
- sqlite의 연동성 문제:
  sqllite가 node기반인데 데이터크롤링은 py코드라 py코드돌리고 이걸 노드서버에서 데이터받아서 저장하고 사용자에 리턴하려면 서버가 두대여야...?
- 이후 해야할일 : 시간표 추가 기능 (검색, 커스텀 등) api 모두 구현 / 프론트 안드로이드 시간표 ui


## 📄 11 01 업데이트
- 소프트웨어 공학 개론 SRS 작성 과제
- part4 use-case digram, data-flow diagram 작성
- 작성 후 미팅 -> 변경 사항 반영 문서 수정
- 최종 제출 완료

## 📄 11 08 업데이트
- 학수번호(PK)를 빼고 크롤링했어서, 학수번호, 수업 정보(온라인/오프라인 등) 포함 모든 과목정보 재크롤링
- 크롤링에서 중복된 강의 모두 보여주도록(나중에 별도 선택) 코드 수정
- DB data 형식으로 데이터 전처리
    - 월16:30-17:45【31214】,수15:00-16:15【31214】=> Time: ["1_16301745", "3_15001615"]/ Room_num: "31214"
- DB 테이블 생성 및 크롤링 과목정보 삽입
    - <img width="1092" alt="20231108203332" src="https://github.com/codefactory-co/flutter-lv1-project-u-and-i/assets/72601276/6f9f521e-7c9a-44cb-9eee-1c0ef604c11a">
- 크롤링 코드 서버에 올리기 위해 전체 리팩토링 (설정경로,변수 통일 등)
- API DB 연동 및 테스트


🔘 *연동 예시*
- (url 요청 받으면 크롤링 후 시간표 정보 반환)
- <img width="497" alt="ㅎㅎㅎ" src="https://github.com/codefactory-co/flutter-lv1-project-u-and-i/assets/72601276/4d26ed1f-63db-4188-ac95-cc526b8cbac5">



**🤔 이슈사항 & 회의**
- DB 관련
    - Courses: Course_ID (PK),Course_name,Professor,Time,Room_num,Class_type,Year,Semester 테이블 변경
    - Courses 시간 데이터 형식 변경, Class_type 추가
    - Students: ID INTEGER PRIMARY KEY AUTOINCREMENT 생성 - 테이블 구조 변경
    - ID INTEGER PRIMARY KEY AUTOINCREMENT 다 넣을지?
    - 커스텀 일정 추가 api 관련 ->커스텀일정은 db에서 어떻게 관리되는지?
- 강의 일부의 수업 정보(온라인/오프라인) 제대로 크롤링되지않음(몇십개) => "" 값으로 채움
- 크롤링 서버는 fastapi로 구현 (더 나은방식 있는지?)
- 안드로이드 두대 서버에 요청 보낼 수 있는지 ?
- "중복된 강의 중 선택" 기능 api 구현 방식
    - 클라이언트 url 요청-> 크롤링 서버에서 db에 시간표 정보 모두(중복된 강의 포함) 저장
    - -> 클라이언트는 중복된 강의 선택 창에서 비수강과목을 "시간표 과목삭제" js서버 api로 요청하여 삭제
