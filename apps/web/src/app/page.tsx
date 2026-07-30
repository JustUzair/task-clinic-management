import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CalendarDays, ShieldCheck, Users } from "lucide-react";
import { LoginForm } from "../components/auth/login-form";

export default function HomePage() {
  return (
    <Box
      component="main"
      sx={{
        backgroundColor: "#edf3f4",
        display: "grid",
        minHeight: "100vh",
        p: { xs: 2, md: 3 },
        placeItems: "center",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { md: "minmax(0, 1.1fr) minmax(24rem, 28rem)" },
          maxWidth: 1180,
          width: "100%",
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(145deg, #12343f 0%, #1a5860 100%)",
            borderRadius: { md: 2 },
            color: "common.white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: { md: 640 },
            p: { xs: 3, md: 5 },
          }}
        >
          <Box>
            <Typography
              sx={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.24em" }}
            >
              CLINIC SHIFT SCHEDULER
            </Typography>
            <Typography component="h1" sx={{ mt: 2 }} variant="h4">
              Manage staffing, claims, and coverage without losing operational
              control.
            </Typography>
            <Typography sx={{ mt: 2, maxWidth: 520, opacity: 0.82 }}>
              One clinic workspace for managers and staff. Shifts, imports,
              claims, and notifications stay consistent while the interface
              remains fast to scan.
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mt: { xs: 4, md: 10 } }}>
            {[
              {
                description:
                  "See open capacity, assign staff, and protect claim rules under concurrent use.",
                icon: CalendarDays,
                title: "Live staffing picture",
              },
              {
                description:
                  "Use imported staff accounts with OTP sign-in and role-aware access.",
                icon: ShieldCheck,
                title: "Controlled access",
              },
              {
                description:
                  "Staff can review their own schedule, claim open work, and acknowledge changes.",
                icon: Users,
                title: "Clear self-service flow",
              },
            ].map(item => (
              <Box
                key={item.title}
                sx={{
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  display: "flex",
                  gap: 2,
                  p: 2,
                }}
              >
                <Box
                  sx={{
                    alignItems: "center",
                    backgroundColor: "rgba(216, 240, 238, 0.16)",
                    borderRadius: 3,
                    display: "flex",
                    height: 48,
                    justifyContent: "center",
                    width: 48,
                  }}
                >
                  <item.icon size={22} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography sx={{ opacity: 0.78 }} variant="body2">
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
        <LoginForm />
      </Box>
    </Box>
  );
}
