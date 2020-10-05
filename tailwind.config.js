module.exports = {
  theme: {
    container: {
      center: true
    },
    boxShadow: {
      outline: "0 0 0 3px rgba(255, 191, 71, 1)"
    },
    maxWidth: {
      "4xl": "53rem"
    },
    fontSize: {
      xs: "1.3rem",
      small: "1.6rem",
      smaller: "1.9rem",
      base: "2.0rem",
      lg: "3.6rem",
      xl: "3.8rem",
      xxl: "6.5rem",
      brand: "2.6rem"
    },
    fontFamily: {
      sans: ["lato"],
      body: ["Noto Sans"]
    },
    screens: {
      sm: "640rem",
      md: "768px",
      lg: "1024px"
    },
    colors: {
      red: {
        default: "#b10e1e"
      },
      white: {
        default: "#FFF"
      },
      blue: {
        lighter: "#B2E3FF",
        default: "#26374A",
        selected: "#75b9e0"
      },
      gray: {
        default: "#EEE",
        selected: "#e1e4e7"
      },
      yellow: {
        default: "#ffbf47"
      },
      green: {
        default: "#00703C",
        darker: "#002D18"
      }
    }
  },
  extend: {
    lineHeight: {
      'extra-tight': '0.9',
    }
  },
  plugins: []
};
