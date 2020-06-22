const { colors } = require("tailwindcss/defaultTheme");

module.exports = {
  purge: false,
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
      width: {
        "60": "15rem",
      },
      maxHeight: {
        "60": "15rem",
      },
      cursor: {
        help: "help",
      },
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
          "100": "#f5f5f5",
          "200": "#eeeeee",
          "300": "#e0e0e0",
          "400": "#bdbdbd",
          "500": "#9e9e9e",
          "600": "#757575",
          "700": "#616161",
          "800": "#424242",
          "900": "#212121",
        },
      },
    },
  },
  variants: {
    textColor: ["hover"],
  },
};
