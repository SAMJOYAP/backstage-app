import React from 'react';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  svg: {
    width: 'auto',
    height: 40,
  },
  frame: {
    fill: 'none',
    stroke: '#235588',
    strokeWidth: 8,
    strokeLinejoin: 'round',
  },
  primary: {
    fill: '#235588',
  },
  accent: {
    fill: '#4DABE8',
  },
  white: {
    fill: '#ffffff',
  },
  line: {
    stroke: '#ffffff',
    strokeWidth: 2.8,
    strokeLinecap: 'round',
  },
});

export const LogoIcon = () => {
  const classes = useStyles();

  return (
    <svg
      className={classes.svg}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 220"
      role="img"
      aria-label="ALREADY11 로고"
    >
      <polygon className={classes.frame} points="110,10 204,58 204,162 110,210 16,162 16,58" />
      <polygon className={classes.primary} points="38,74 110,38 154,60 154,102 110,110 110,188 38,152" />
      <polygon className={classes.primary} points="146,66 186,86 186,146 146,166" />
      <polygon className={classes.primary} points="132,58 146,66 146,166 132,174" />
      <polygon className={classes.accent} points="110,150 132,150 132,174 110,188" />
      <polygon className={classes.accent} points="52,92 62,88 62,156 52,150" />
      <polygon className={classes.accent} points="72,82 82,78 82,166 72,160" />
      <polygon className={classes.accent} points="92,72 102,68 102,176 92,170" />
      <line className={classes.line} x1="152" y1="94" x2="178" y2="96" />
      <line className={classes.line} x1="165" y1="84" x2="165" y2="106" />
      <line className={classes.line} x1="152" y1="126" x2="178" y2="124" />
      <line className={classes.line} x1="165" y1="114" x2="165" y2="136" />
      <rect className={classes.white} x="137" y="109" width="16" height="5" rx="2.5" transform="rotate(3 145 111.5)" />
    </svg>
  );
};
