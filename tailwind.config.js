const { colors } = require("tailwindcss/defaultTheme");

module.exports = {
  important: true,
  theme: {
    extend: {
      colors: {
        black: "#010101",
        blue: {
          ...colors.blue,
          "500": "#0366d6",
        },
        yellow: {
          ...colors.yellow,
          "500": "#ffe310",
        },
        green: {
          ...colors.green,
          "500": "#26dc4e",
        },
        red: {
          ...colors.red,
          "500": "#f03009",
        },
        gray: {
          "100": "#e6e6e6",
          "200": "#cccccc",
          "300": "#b3b3b3",
          "400": "#999999",
          "500": "#808080",
          "600": "#666666",
          "700": "#4d4d4d",
          "800": "#333333",
          "900": "#1a1a1a",
        },
      },
    },
  },
  variants: {
    textColor: ["hover"],
  },
};
