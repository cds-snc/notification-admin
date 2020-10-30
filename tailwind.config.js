const plugin = require('tailwindcss/plugin')

module.exports = {
  theme: {
    container: {
      center: true
    },
    backgroundImage: {
      tick: "url('/static/images/tick.png')",
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
      title: "2.4rem",
      lg: "3.6rem",
      xl: "3.8rem",
      '48': "4.8rem",
      xxl: "6.5rem",
      brand: "2.6rem"
    },
    screens: {
      xs: {'max': "639px"},
      sm: "640px",
      md: "768px",
      lg: "1024px"
    },
    colors: {
      red: {
        default: "#b10e1e",
        hover: "#990c1a",
        border: "#6a0812"
      },
      white: {
        default: "#FFF"
      },
      blue: {
        lighter: "#B2E3FF",
        default: "#26374A",
        selected: "#75b9e0",
        govukblue: "#005ea5",
        lightblue25: "#d5e8f3",
      },
      gray: {
        default: "#eee",
        button: "#dee0e2",
        selected: "#e1e4e7",
        hover: "#d0d3d6",
        border: "#b5babe",
        grey1: "#6f777b",
      },
      yellow: {
        default: "#ffbf47"
      },
      green: {
        default: "#00823b",
        darker: "#00703C",
        hover: "#00692f",
        border: "#003618",
        green: "#006435",
      },
      black: {
        default: "#000"
      },
      transparent: {
        default: "transparent"
      }
    },
    extend: {
      backgroundSize: {
        '19': '19px',
      },
      borderWidth: {
        '1':'1px',
      },
      fontFamily: {
        sans: ["lato"],
        body: ["Noto Sans"]
      },
      inset: {
        '2': '2px',
        '5': '5px',
        '7': '7px',
      },
      lineHeight: {
        'extra-tight': '0.9',
      },
      outline: {
        yellow: '3px solid #ffbf47'
      },
      spacing: {
        gutter: '30px',
        gutterHalf: '15px',
        gutterAndAHalf: '45px',
      }
    },
  },
  plugins: [
    plugin(function({ addVariant, e }) {
      addVariant('link', ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`link${separator}${className}`)}:link`
        })
      })
    })
  ],
  variants: {
    textColor: ['visited', 'link'],
  },
};
