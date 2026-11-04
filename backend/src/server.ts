import { app } from "./app.js";
app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log("AcheDoações API: http://localhost:3001"),
);
