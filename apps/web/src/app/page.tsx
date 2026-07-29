import Box from "@mui/material/Box";
import { LoginForm } from "../components/auth/login-form";

export default function HomePage() {
  return (
    <Box
      component="main"
      sx={{
        display: "grid",
        minHeight: "100vh",
        p: 2,
        placeItems: "center",
      }}
    >
      <LoginForm />
    </Box>
  );
}
