const API_URL =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000/api";

export async function api(
    path,
    options = {}
) {
    const response = await fetch(
        `${API_URL}${path}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        }
    );

    const data = await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error ||
            `Request failed: ${response.status}`
        );
    }

    return data;
}