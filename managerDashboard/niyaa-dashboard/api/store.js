// const REMOTE_JSON_URL =
//   'https://myjson.online/api/quick/51fd2b5f-ca2b-4a6d-9812-779409f19724';

// export default async function handler(req, res) {
//   try {
//     // FETCH DATA
//     if (req.method === 'GET') {
//       const response = await fetch(REMOTE_JSON_URL, {
//         headers: {
//           Accept: 'application/json',
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`Remote GET failed (${response.status})`);
//       }

//       const data = await response.json();

//       return res.status(200).json(data);
//     }

//     // SAVE DATA
//     if (req.method === 'POST') {
//       const response = await fetch(REMOTE_JSON_URL, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Accept: 'application/json',
//         },
//         body: JSON.stringify(req.body),
//       });

//       if (!response.ok) {
//         throw new Error(`Remote PUT failed (${response.status})`);
//       }

//       const data = await response.json();

//       return res.status(200).json(data);
//     }

//     return res.status(405).json({
//       success: false,
//       message: 'Method not allowed',
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// }