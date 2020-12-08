const plugin = require('tailwindcss/plugin')

module.exports = {
  theme: {
    container: {
      center: true
    },
    backgroundImage: {
      tick: "url('/static/images/tick.png')",
      folder: "url('/static/images/folder-black.svg')",
      folderBlack: "url('/static/images/folder-black-bold.svg')",
      folderBlackPng: "url('/static/images/folder-black-bold.png')",
      folderBlue: "url('/static/images/folder-blue-bold.svg')",
      folderBluePng: "url('/static/images/folder-blue-bold.png')",
      folderBlueHover: "url('/static/images/folder-blue-bold-hover.svg')",
      folderBlueHoverPng: "url('/static/images/folder-blue-bold-hover.png')",
    },
    boxShadow: {
      outline: "0 0 0 3px rgba(255, 191, 71, 1)",
      inset1: "inset -1px 0 0 0 rgb(191, 193, 195)", // theme gray.grey2
      inset3: "inset -3px 0 0 0 rgba(191, 193, 195, 0.2)",
      outset1: "1px 0 0 0 rgb(191, 193, 195)",
      outset3: "3px 0 0 0 rgba(191, 193, 195, 0.2)",
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
      '3xl': "9rem",
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
        border: "#6a0812",
        mellow: "#df3034"
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
        lightblue: "#2b8cc4",
      },
      gray: {
        default: "#eee",
        button: "#dee0e2", /* grey3 */
        selected: "#e1e4e7",
        hover: "#d0d3d6",
        border: "#b5babe",
        grey1: "#6f777b",
        grey2: "#bfc1c3",
        grey4: "#f8f8f8",
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
        body: ["Noto Sans", "Arial", "sans-serif"],
        monospace: ["monospace"]
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
        yellow: '3px solid #ffbf47',
        white: '1px solid rgba(255, 255, 255, 0.1)',
      },
      spacing: {
        gutter: '30px',
        gutterHalf: '15px',
        gutterAndAHalf: '45px',
        doubleGutter: '60px',
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
    }),
    plugin(function({ addUtilities, theme }) {
      const individualBorderColors = {
        '.border-b-gray-button': {
          borderBottomColor: theme('colors').gray.button
        },
        '.border-l-gray-button': {
          borderLeftColor: theme('colors').gray.button
        },
        '.border-b-gray-grey2': {
          borderBottomColor: theme('colors').gray.grey2
        }
      };

      addUtilities(individualBorderColors);
    }),
  ],
  variants: {
    textColor: ['visited', 'link'],
  },
};
