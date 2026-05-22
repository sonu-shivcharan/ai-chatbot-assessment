import app from "./app";
import dbConnect from "./utils/db-connect";

const PORT = process.env.PORT || 3000;

dbConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("DB connection failed Error::", error);
  });
