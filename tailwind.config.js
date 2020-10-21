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
      xxl: "6.5rem",
      brand: "2.6rem"
    },
    fontFamily: {
      sans: ["lato"],
      body: ["Noto Sans"]
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
        selected: "#75b9e0"
      },
      gray: {
        default: "#eee",
        button: "#dee0e2",
        selected: "#e1e4e7",
        hover: "#d0d3d6",
        border: "#b5babe"
      },
      yellow: {
        default: "#ffbf47"
      },
      green: {
        default: "#00823b",
        darker: "#00703C",
        hover: "#00692f",
        border: "#003618"
      },
      black: {
        default: "#000"
      }
    },
    extend: {
      backgroundSize: {
        '19': '19px',
      },
      backgroundPosition: {
        tickPos: "15px 15px",
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
