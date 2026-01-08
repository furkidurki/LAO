export const theme = {
    colors: {
        // Persona 3 Reload vibe (but professional)
        bg: "#F6F7FB",
        surface: "#FFFFFF",
        surface2: "#F0F3FA",
        border: "rgba(11,16,32,0.10)",

        text: "#0B1020",
        muted: "rgba(11,16,32,0.62)",

        primary: "#00B7C2",   // teal
        primary2: "#2E5BFF",  // blue
        accent: "#F5C542",    // yellow

        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#EF4444",

        white: "#FFFFFF",
        black: "#000000",

        glowTeal: "rgba(0,183,194,0.16)",
        glowBlue: "rgba(46,91,255,0.14)",
        glowYellow: "rgba(245,197,66,0.16)",
    },
    radius: {
        sm: 12,
        md: 16,
        lg: 20,
        xl: 26,
        pill: 999,
    },
    spacing: {
        xs: 6,
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
    typography: {
        title: { fontSize: 28, fontWeight: "900" as const, letterSpacing: -0.2 },
        h2: { fontSize: 18, fontWeight: "900" as const, letterSpacing: -0.1 },
        body: { fontSize: 14, fontWeight: "800" as const },
        caption: { fontSize: 12, fontWeight: "800" as const },
    },
    shadow: {
        card: {
            shadowColor: "#000",
            shadowOpacity: 0.10,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
        },
        press: {
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
        },
    },
};
