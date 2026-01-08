// functions/get-profile.js
export async function handler(event) {
  try {
    const regdno = event.queryStringParameters?.regdno;

    if (!regdno) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "regdno required" })
      };
    }

    const TOKEN = process.env.GITAM_TOKEN;

    const response = await fetch(
      `https://studentmobileapi.gitam.edu/getprofile?regdno=${regdno}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Profile fetch failed",
          status: response.status
        })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
