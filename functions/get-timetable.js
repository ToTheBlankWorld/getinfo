export async function handler(event) {
  const regdno = event.queryStringParameters?.regdno;

  if (!regdno) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "regdno required" })
    };
  }

  const TOKEN = process.env.GITAM_TOKEN;

  const response = await fetch(
    `https://studentmobileapi.gitam.edu/gettimetable?regdno=${regdno}`,
    {
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "User-Agent": "okhttp/4.9.0",
        "Accept": "application/json"
      }
    }
  );

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: "Timetable fetch failed" })
    };
  }

  const data = await response.json();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}
