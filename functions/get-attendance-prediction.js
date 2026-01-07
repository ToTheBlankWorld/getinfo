// functions/get-attendance-prediction.js
export async function handler(event) {
  try {
    const regdno = event.queryStringParameters?.regdno;
    if (!regdno) {
      return { statusCode: 400, body: "regdno required" };
    }

    const TOKEN = process.env.GITAM_TOKEN;

    const HEADERS = {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "okhttp/4.9.0"
    };

    const ATT_URL = `https://studentmobileapi.gitam.edu/getattendance?regdno=${regdno}`;
    const TT_URL  = `https://studentmobileapi.gitam.edu/gettimetable?regdno=${regdno}`;

    const [attRes, ttRes] = await Promise.all([
      fetch(ATT_URL, { headers: HEADERS }),
      fetch(TT_URL,  { headers: HEADERS })
    ]);

    const attendanceRaw = await attRes.json();
    const timetableRaw  = await ttRes.json();

    /* ================= CONFIG ================= */
    const TOTAL_WORKING_DAYS = 79;
    const WORKING_DAYS_PER_WEEK = 5;
    const SEMESTER_WEEKS = 15;
    const TARGET_PERCENT = 75;
    const SEMESTER_START = new Date("2025-12-01");

    /* ============= PARSE ATTENDANCE ============= */
    const attendanceMap = {};
    (attendanceRaw.sem || []).forEach(s => {
      attendanceMap[s.coursecode.trim()] = parseFloat(s.percentage || 0);
    });

    /* ============= WORKING DAYS ============= */
    function getWorkingDaysDone() {
      let today = new Date();
      let days = 0;
      for (let d = new Date(SEMESTER_START); d <= today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) days++;
      }
      return Math.min(days, TOTAL_WORKING_DAYS);
    }

    const workingDaysDone = getWorkingDaysDone();
    const weeksDone = Math.max(0, (workingDaysDone / WORKING_DAYS_PER_WEEK) - 1); // CRT removed

    /* ============= EXTRACT TIMETABLE ============= */
    const courses = {};
    ["monday","tuesday","wednesday","thursday","friday"].forEach(day => {
      (timetableRaw[day] || []).forEach(e => {
        const code = e.subjecT_CODE?.trim();
        if (!code) return;
        if (!courses[code]) {
          courses[code] = {
            subject_name: e.subject_name?.trim() || "",
            classes_per_week: 0
          };
        }
        courses[code].classes_per_week++;
      });
    });

    /* ============= ATTENDANCE MATH ============= */
    const result = [];

    for (const code in courses) {
      const cpw = courses[code].classes_per_week;
      const total = cpw * SEMESTER_WEEKS;
      const done  = Math.floor(cpw * weeksDone);
      const percent = attendanceMap[code] || 0;

      const attended = Math.floor((percent / 100) * done);
      const minRequired = Math.ceil((TARGET_PERCENT / 100) * total);
      const remaining = total - done;

      const mustAttend = Math.max(0, minRequired - attended);
      const canSkip = Math.max(0, remaining - mustAttend);

      let status = "SAFE";
      if (attended < minRequired && mustAttend <= remaining) status = "NEEDS_ATTENTION";
      if (mustAttend > remaining) status = "NOT_POSSIBLE";

      result.push({
        subject_code: code,
        subject_name: courses[code].subject_name,
        classes_per_week: cpw,
        classes_done: done,
        attended,
        total_classes: total,
        remaining_classes: remaining,
        must_attend: mustAttend,
        can_skip: canSkip,
        status
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
