// @flow
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import Text from "../Text";
import Heading from "../Heading";
import Handle from "./components/Handle";
import Bar from "./components/Bar";
import getBoundingClientRect from "./utils/getBoundingClientRect";
import calculateBarPosition from "./utils/calculateBarPosition";
import KEY_CODE_MAP from "../common/keyMaps";

const StyledSlider = styled.div`
  position: relative;
  background: white;
  padding: 16px 16px 16px 12px;
`;

const StyledSliderInput = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 24px;
  margin-top: 16px;
`;

function Slider({ label, description, defaultValue, min = 1, max = 100, step = 1 }) {
  const container = useRef();
  const bar = useRef();
  const [value, setValue] = useState(defaultValue || 1);
  const [handleIndex, setHandleIndex] = useState(undefined);
  const [parentWidth, setParentWidth] = useState(undefined);
  const [values, setValues] = useState([]);

  let timeout;

  const calculateWidth = () => {
    const containerRect = getBoundingClientRect(container);
    if (containerRect) {
      setParentWidth(containerRect.width);
    }
  };

  const pauseEvent = e => {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  };

  const alignValueToStep = val => {
    if (step === 1) return val;
    const gap = val % step;
    if (gap === 0) return val;
    if (gap * 2 >= step) {
      return val - gap + step;
    }
    return val - gap;
    // TODO: when current value is 1 and next should be 6, needs to be 5
  };

  const alignValueToMaxMin = val => {
    if (val > max) {
      return max;
    }
    if (val < min) {
      return min;
    }
    return val;
  };

  const alignValue = newValue => alignValueToMaxMin(alignValueToStep(newValue));

  const replaceValue = (newValue, index) => {
    if (index == null || !Array.isArray(value)) return newValue;
    return value.map((item, key) => (key === index ? newValue : item));
  };

  const moveValueByStep = lStep => {
    if (Array.isArray(value)) {
      const newValue = replaceValue(
        alignValue(value[Number(handleIndex)] + lStep),
        Number(handleIndex),
      );
      setValue(newValue);
    } else {
      const newValue = alignValue(value + lStep);
      setValue(newValue);
    }
  };

  const handleKeyDown = event => {
    if (event.ctrlKey || event.shiftKey || event.altKey) return;

    if (event.keyCode === KEY_CODE_MAP.ARROW_UP || event.keyCode === KEY_CODE_MAP.ARROW_RIGHT) {
      pauseEvent(event);
      moveValueByStep(step);
    }
    if (event.keyCode === KEY_CODE_MAP.ARROW_DOWN || event.keyCode === KEY_CODE_MAP.ARROW_LEFT) {
      pauseEvent(event);
      moveValueByStep(-step);
    }
    if (event.keyCode === KEY_CODE_MAP.HOME) {
      pauseEvent(event);
      setValue(min);
    }
    if (event.keyCode === KEY_CODE_MAP.END) {
      pauseEvent(event);
      setValue(max);
    }
  };

  const handleBlur = () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("focusout", handleBlur);
  };

  const handleOnFocus = i => e => {
    setHandleIndex(i);
    pauseEvent(e);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("focusout", handleBlur);
  };

  const calculateValueFromPosition = pageX => {
    const barRect = getBoundingClientRect(bar);
    const mousePosition = pageX - barRect.left;
    const positionRatio = mousePosition / barRect.width;
    return Math.round((max - min) * positionRatio + min);
  };

  const findClosestKey = goal =>
    value.reduce((acc, curr, index) => {
      return Math.abs(curr - goal) < Math.abs(value[acc] - goal) ? index : acc;
    }, 0);

  const handleBarMouseDown = event => {
    const newValue = calculateValueFromPosition(event.pageX);
    if (Array.isArray(value)) {
      const index = findClosestKey(newValue);
      const replacedValue = replaceValue(alignValue(newValue), index);
      setValue(replacedValue);
    } else {
      setValue(alignValue(newValue));
    }
  };

  const handleMouseMove = event => {
    const newValue = calculateValueFromPosition(event.pageX);
    setValues([...values, newValue]);
    if (Array.isArray(value)) {
      const replacedValue = replaceValue(alignValue(newValue), Number(handleIndex));
      setValue(replacedValue);
    } else {
      setValue(alignValue(newValue));
    }
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = i => event => {
    // just allow left-click
    if (event.button === 0 && event.buttons !== 2) {
      if (i) setHandleIndex(i);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      pauseEvent(event);
    }
  };

  useEffect(() => {
    timeout = setTimeout(calculateWidth, 10);
    window.addEventListener("resize", calculateWidth);
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      window.removeEventListener("resize", calculateWidth);
    };
  });

  const handle = (lValue, lHandleMouseDown, lHandleOnFocus) => (
    <Handle
      tabIndex={0}
      valueMax={max}
      valueMin={min}
      valueNow={lValue}
      onMouseDown={lHandleMouseDown}
      onFocus={lHandleOnFocus}
      parentWidth={parentWidth}
    />
  );
  return (
    <StyledSlider>
      {label && <Heading type="title4">{label}</Heading>}
      {description && (
        <Text type="secondary" size="small">
          {description}
        </Text>
      )}
      <StyledSliderInput ref={container}>
        <Bar
          ref={bar}
          onMouseDown={handleBarMouseDown}
          {...calculateBarPosition(parentWidth, value, max, min)}
        />
        {Array.isArray(value)
          ? value.map((x, i) => handle(value[i], handleMouseDown(i), handleOnFocus(i)))
          : handle(value, handleMouseDown(), handleOnFocus())}
      </StyledSliderInput>
    </StyledSlider>
  );
}

export default Slider;
