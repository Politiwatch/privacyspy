const { colors } = require("tailwindcss/defaultTheme");

module.exports = {
  important: true,
  theme: {
    opacity: {
      "10": ".1",
      "20": ".2",
      "30": ".3",
      "40": ".4",
      "50": ".5",
    },
    zIndex: {
      "-1": "-1",
      "1": "1",
    },
    extend: {
      colors: {
        black: "#010101",
        blue: {
          ...colors.blue,
          "500": "#0366d6",
        },
        yellow: {
          ...colors.yellow,
          "500": "#fdd835",
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
          "100": "#f0f0f0",
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
