const plugin = require('tailwindcss/plugin')

module.exports = {
  theme: {
    container: {
      center: true
    },
    boxShadow: {
      outline: "0 0 0 3px rgba(255, 191, 71, 1)", /* yellow */
      outline4: "0 0 0 4px rgba(255, 191, 71, 1)",
      inset1: "inset -1px 0 0 0 rgb(191, 193, 195)", // theme gray.grey2
      inset3: "inset -3px 0 0 0 rgba(191, 193, 195, 0.2)",
      outset1: "1px 0 0 0 rgb(191, 193, 195)",
      outset2: "0 2px 0 0 rgba(191, 193, 195, 0.2)",
      outset2neg: "0 -2px 0 0 rgba(191, 193, 195, 0.2)",
      outset3: "3px 0 0 0 rgba(191, 193, 195, 0.2)",
      yellow3: "-3px 0 0 0 rgba(255, 191, 71, 1), 3px 0 0 0 rgba(255, 191, 71, 1)",
    },
    fontSize: {
      xs: "1.3rem",
      small: "1.6rem",
      smaller: "1.9rem",
      base: "2.0rem",
      title: "2.4rem",
      titlelarge: "2.7rem",
      lg: "3.6rem",
      xl: "3.8rem",
      '48': "4.8rem",
      xxl: "6.5rem",
      '3xl': "9rem",
      brand: "2.6rem"
    },
    screens: {
      xs: "320px",
      smaller: "375px",
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
        border: "#1A3152",
        selected: "#75b9e0",
        lightblue25: "#d5e8f3",
        lightblue: "#2b8cc4",
        slightlight: "#284162"
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
        lightgrey: "#C0C1C3",
        visitedlight: "#929AA4",
        visiteddark: "#C8CDD1",
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
      animation: {
        'ellipsis': 'ellipsis steps(4,end) 1.5s infinite',
      },
      backgroundImage: {
        tick: "url('/static/images/tick.png')",
        crossGrey: "url('/static/images/cross-grey.png')",
        folder: "url('/static/images/folder-black.svg')",
        folderBlack: "url('/static/images/folder-black-bold.svg')",
        folderBlackPng: "url('/static/images/folder-black-bold.png')",
        folderBlue: "url('/static/images/folder-blue-bold.svg')",
        folderBluePng: "url('/static/images/folder-blue-bold.png')",
        folderBlueHover: "url('/static/images/folder-blue-bold-hover.svg')",
        folderBlueHoverPng: "url('/static/images/folder-blue-bold-hover.png')",
      },
      backgroundSize: {
        '19': '19px',
      },
      borderWidth: {
        '1':'1px',
        '10':'10px',
      },
      fontFamily: {
        sans: ["lato"],
        body: ["Noto Sans", "Arial", "sans-serif"],
        monospace: ["monospace"],
      },
      inset: {
        '2': '2px',
        '5': '5px',
        '7': '7px',
      },
      keyframes: {
        'ellipsis': {
          '100%': { width: '1.25em' }
        }
      },
      lineHeight: {
        'extra-tight': '0.9',
      },
      maxWidth: {
        "4xl": "53rem"
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
      },
      transitionDuration: {
        '600': '600ms',
      },
      transitionProperty: {
        'background': 'background',
      },
      width: {
        '5/8': '62.5%'
      },
      flex: {
        2: "2 2 0%",
      },
      zIndex: {
        '100': 100,
      },
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
    borderWidth: ['responsive', 'focus'],
    textColor: ['visited', 'link', 'hover', 'focus'],
  },
};
