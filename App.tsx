import React, { ReactNode, useCallback, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type AngleMode = "DEG" | "RAD";
type ButtonType = "normal" | "numpad" | "accent" | "small";

const formatAsFraction = (value: number) => {
  const isNegative = value < 0;
  let val = Math.abs(value);

  const tolerance = 1.0e-10;
  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let b = val;

  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (
    Number.isFinite(b) &&
    Math.abs(val - h1 / k1) > val * tolerance
  );

  const num = h1;
  const den = k1;

  if (den > 10000) return null;

  const signStr = isNegative ? "-" : "";
  if (den === 1) return `${signStr}${num}`;

  const whole = Math.floor(num / den);
  const rem = num % den;

  if (whole > 0) {
    return `${signStr}${whole}┘${rem}┘${den}`;
  }

  return `${signStr}${num}┘${den}`;
};

const evaluateMath = (
  expression: string,
  mode: AngleMode,
  currentAns: number,
) => {
  if (!expression) return "";

  let parsed = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\^/g, "**")
    .replace(/√\(/g, "sqrt(")
    .replace(/π/g, "PI")
    .replace(/Ans/g, `(${currentAns})`)
    .replace(/E/g, "*10**");

  const hasFraction = parsed.includes("┘");

  parsed = parsed.replace(/(\d+)┘(\d+)┘(\d+)/g, "($1+$2/$3)");
  parsed = parsed.replace(/(\d+)┘(\d+)/g, "($1/$2)");
  parsed = parsed.replace(/(\d)(\()/g, "$1*$2");
  parsed = parsed.replace(/(\))(\d)/g, "$1*$2");
  parsed = parsed.replace(/(\d)([a-z])/gi, "$1*$2");

  const vars = {
    sin: (x: number) => Math.sin(mode === "DEG" ? x * (Math.PI / 180) : x),
    cos: (x: number) => Math.cos(mode === "DEG" ? x * (Math.PI / 180) : x),
    tan: (x: number) => Math.tan(mode === "DEG" ? x * (Math.PI / 180) : x),
    asin: (x: number) =>
      mode === "DEG" ? Math.asin(x) * (180 / Math.PI) : Math.asin(x),
    acos: (x: number) =>
      mode === "DEG" ? Math.acos(x) * (180 / Math.PI) : Math.acos(x),
    atan: (x: number) =>
      mode === "DEG" ? Math.atan(x) * (180 / Math.PI) : Math.atan(x),
    log: Math.log10,
    ln: Math.log,
    sqrt: Math.sqrt,
    PI: Math.PI,
    E: Math.E,
  };

  const args = Object.keys(vars);
  const values = Object.values(vars);

  try {
    const f = new Function(...args, `return ${parsed}`);
    const result = f(...values) as number;

    if (Number.isNaN(result) || !Number.isFinite(result)) return "Math ERROR";

    let finalResult = Number.parseFloat(result.toPrecision(12)).toString();

    if (hasFraction && Number.isFinite(result) && !Number.isInteger(result)) {
      const fracStr = formatAsFraction(result);
      if (fracStr) {
        finalResult = fracStr;
      }
    }

    return finalResult;
  } catch {
    return "Syntax ERROR";
  }
};

const formatDisplayText = (text: string) => {
  if (!text) return null;
  const parts = text.toString().split("┘");
  return parts.map((part, index) => (
    <React.Fragment key={`${part}-${index}`}>
      <Text>{part}</Text>
      {index < parts.length - 1 ? (
        <Text style={styles.fractionMark}>┘</Text>
      ) : null}
    </React.Fragment>
  ));
};

interface CalcButtonProps {
  label: string;
  shiftLabel?: string;
  alphaLabel?: string;
  blueLabel?: string;
  type?: ButtonType;
  onPress: () => void;
  width?: number | `${number}%`;
  scale?: number;
}

function CalcButton({
  label,
  shiftLabel,
  alphaLabel,
  blueLabel,
  type = "normal",
  onPress,
  width,
  scale: explicitScale,
}: CalcButtonProps) {
  const widthNumber = typeof width === "number" ? width : undefined;
  const scale =
    explicitScale ??
    Math.min(1, Math.max(0.55, widthNumber ? widthNumber / (type === "small" ? 43 : 52) : 1));
  const buttonStyles = [
    styles.button,
    {
      height: (type === "small" ? 22 : 31) * scale,
      borderRadius: 4 * scale,
    },
    type === "numpad" && styles.numpadButton,
    type === "accent" && styles.accentButton,
  ];
  const wrapperStyles = [
    styles.buttonWrapper,
    { height: (type === "small" ? 32 : 42) * scale },
    width ? { width } : null,
  ];

  return (
    <View style={wrapperStyles}>
      <View style={styles.topLabelRow} pointerEvents="none">
        {shiftLabel ? (
          <Text
            style={[styles.shiftLabel, { fontSize: 6.8 * scale }]}
            numberOfLines={1}
          >
            {shiftLabel}
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.rightLabels}>
          {blueLabel ? (
            <Text
              style={[styles.blueLabel, { fontSize: 6 * scale }]}
              numberOfLines={1}
            >
              {blueLabel}
            </Text>
          ) : null}
          {alphaLabel ? (
            <Text
              style={[styles.alphaLabel, { fontSize: 6.8 * scale }]}
              numberOfLines={1}
            >
              {alphaLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          buttonStyles,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text
          style={[styles.buttonText, { fontSize: (type === "small" ? 9 : 11) * scale }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

function StatusIndicator({
  children,
  visible = true,
}: {
  children: ReactNode;
  visible?: boolean;
}) {
  return (
    <Text style={[styles.statusText, !visible && styles.hiddenText]}>
      {children}
    </Text>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const [displayExp, setDisplayExp] = useState("");
  const [displayResult, setDisplayResult] = useState("");
  const [ans, setAns] = useState(0);
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");

  const availableWidth = width - 24;
  const availableHeight = height - 20;
  const calculatorWidth = Math.min(availableWidth, availableHeight * 0.435, 320);
  const calculatorHeight = Math.min(availableHeight, calculatorWidth / 0.435);
  const scale = calculatorWidth / 340;
  const innerWidth = calculatorWidth - 40 * scale;
  const scientificGap = 7 * scale;
  const numpadGap = 9 * scale;
  const scientificButtonWidth = (innerWidth - scientificGap * 5) / 6;
  const numpadButtonWidth = (innerWidth - numpadGap * 4) / 5;

  const handleKey = useCallback(
    (val: string, shiftVal: string | null = null, alphaVal: string | null = null) => {
      let inputToAppend = val;

      if (isShift && shiftVal !== null) {
        inputToAppend = shiftVal;
      } else if (isAlpha && alphaVal !== null) {
        inputToAppend = alphaVal;
      }

      if (inputToAppend === "AC") {
        setDisplayExp("");
        setDisplayResult("");
        setIsShift(false);
        setIsAlpha(false);
        return;
      }

      if (inputToAppend === "DEL") {
        setDisplayExp((prev) => prev.slice(0, -1));
        return;
      }

      if (inputToAppend === "=") {
        const res = evaluateMath(displayExp, angleMode, ans);
        setDisplayResult(res);
        if (res !== "Syntax ERROR" && res !== "Math ERROR") {
          const numericResult = Number(res);
          if (Number.isFinite(numericResult)) {
            setAns(numericResult);
          }
        }
        setIsShift(false);
        setIsAlpha(false);
        return;
      }

      if (inputToAppend === "SHIFT") {
        setIsShift(!isShift);
        setIsAlpha(false);
        return;
      }

      if (inputToAppend === "ALPHA") {
        setIsAlpha(!isAlpha);
        setIsShift(false);
        return;
      }

      if (inputToAppend === "MODE") {
        setAngleMode((prev) => (prev === "DEG" ? "RAD" : "DEG"));
        return;
      }

      setDisplayExp((prev) => prev + inputToAppend);
      setIsShift(false);
      setIsAlpha(false);
    },
    [angleMode, ans, displayExp, isAlpha, isShift],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View
          style={[
            styles.calculatorBody,
            {
              width: calculatorWidth,
              minHeight: calculatorHeight,
              maxHeight: availableHeight,
              padding: 20 * scale,
              borderRadius: 32 * scale,
            },
          ]}
        >
          <View style={[styles.brandingHeader, { marginBottom: 10 * scale }]}>
            <Text style={[styles.brand, { fontSize: 24 * scale }]}>CASIO</Text>
            <Text style={[styles.model, { fontSize: 10 * scale }]}>fx-82MS</Text>
          </View>
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: 10 * scale,
                marginBottom: 14 * scale,
                letterSpacing: 2.2 * scale,
              },
            ]}
          >
            S-V.P.A.M. <Text style={styles.subtitleSmall}>2nd edition</Text>
          </Text>

          <View style={[styles.screenBezel, { marginBottom: 12 * scale }]}>
            <View style={[styles.screen, { height: 64 * scale }]}>
              <View style={styles.gridOverlay} />
              <View style={styles.statusRow}>
                <StatusIndicator visible={isShift}>S</StatusIndicator>
                <StatusIndicator visible={isAlpha}>A</StatusIndicator>
                <StatusIndicator>{angleMode}</StatusIndicator>
              </View>
              <Text style={styles.expressionLine}>
                {formatDisplayText(displayExp)}
              </Text>
              <Text style={styles.resultLine} numberOfLines={1} adjustsFontSizeToFit>
                {formatDisplayText(displayResult)}
              </Text>
            </View>
          </View>

          <View style={styles.keypad}>
            <View style={[styles.controlRow, { height: 76 * scale }]}>
              <View style={[styles.roundGroup, { gap: 12 * scale }]}>
                <View style={styles.roundStack}>
                  <Text style={styles.shiftRoundLabel}>SHIFT</Text>
                  <Pressable
                    onPress={() => handleKey("SHIFT")}
                    accessibilityRole="button"
                    accessibilityLabel="SHIFT"
                    style={[
                      styles.roundButton,
                      {
                        width: 30 * scale,
                        height: 30 * scale,
                        borderRadius: 15 * scale,
                      },
                      isShift && styles.roundActive,
                    ]}
                  />
                </View>
                <View style={styles.roundStack}>
                  <Text style={styles.alphaRoundLabel}>ALPHA</Text>
                  <Pressable
                    onPress={() => handleKey("ALPHA")}
                    accessibilityRole="button"
                    accessibilityLabel="ALPHA"
                    style={[
                      styles.roundButton,
                      {
                        width: 30 * scale,
                        height: 30 * scale,
                        borderRadius: 15 * scale,
                      },
                      isAlpha && styles.roundActive,
                    ]}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.dpad,
                  {
                    width: 64 * scale,
                    height: 64 * scale,
                    marginLeft: -32 * scale,
                    borderRadius: 32 * scale,
                  },
                ]}
              >
                <Text style={[styles.dpadArrow, styles.dpadUp]}>▲</Text>
                <Text style={[styles.dpadArrow, styles.dpadDown]}>▼</Text>
                <Text style={[styles.dpadArrow, styles.dpadLeft]}>◀</Text>
                <Text style={[styles.dpadArrow, styles.dpadRight]}>▶</Text>
                <View
                  style={[
                    styles.dpadCenter,
                    {
                      width: 16 * scale,
                      height: 16 * scale,
                      borderRadius: 8 * scale,
                    },
                  ]}
                />
              </View>

              <View style={[styles.roundGroup, { gap: 12 * scale }]}>
                <View style={styles.roundStack}>
                  <View style={styles.modeLabelRow}>
                    <Text style={styles.whiteRoundLabel}>MODE</Text>
                    <Text style={styles.shiftRoundLabel}>CLR</Text>
                  </View>
                  <Pressable
                    onPress={() => handleKey("MODE")}
                    accessibilityRole="button"
                    accessibilityLabel="MODE"
                    style={[
                      styles.roundButton,
                      {
                        width: 30 * scale,
                        height: 30 * scale,
                        borderRadius: 15 * scale,
                      },
                    ]}
                  />
                </View>
                <View style={styles.roundStack}>
                  <Text style={styles.whiteRoundLabel}>ON</Text>
                  <Pressable
                    onPress={() => handleKey("AC")}
                    accessibilityRole="button"
                    accessibilityLabel="ON"
                    style={[
                      styles.roundButton,
                      {
                        width: 30 * scale,
                        height: 30 * scale,
                        borderRadius: 15 * scale,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.scientificTopRow}>
              <View style={styles.scientificPair}>
                <CalcButton
                  label="x⁻¹"
                  shiftLabel="x!"
                  onPress={() => handleKey("^-1")}
                  type="small"
                  width={scientificButtonWidth}
                  scale={scale}
                />
                <CalcButton
                  label="nCr"
                  shiftLabel="nPr"
                  onPress={() => handleKey("C", "P")}
                  type="small"
                  width={scientificButtonWidth}
                  scale={scale}
                />
              </View>
              <View style={styles.scientificPair}>
                <CalcButton
                  label="Pol("
                  shiftLabel="Rec("
                  alphaLabel=":"
                  onPress={() => handleKey("Pol(")}
                  type="small"
                  width={scientificButtonWidth}
                  scale={scale}
                />
                <CalcButton
                  label="x³"
                  shiftLabel="³√"
                  onPress={() => handleKey("^3", "^(1/3)")}
                  type="small"
                  width={scientificButtonWidth}
                  scale={scale}
                />
              </View>
            </View>

            <View style={[styles.grid6, { gap: scientificGap }]}>
              <CalcButton
                label="ab/c"
                shiftLabel="d/c"
                onPress={() => handleKey("┘")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="√"
                onPress={() => handleKey("sqrt(")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="x²"
                onPress={() => handleKey("^2")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="^"
                shiftLabel="ˣ√"
                onPress={() => handleKey("^")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="log"
                shiftLabel="10ˣ"
                onPress={() => handleKey("log(", "10^")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="ln"
                shiftLabel="eˣ"
                alphaLabel="e"
                onPress={() => handleKey("ln(", "e^")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />

              <CalcButton
                label="(-)"
                alphaLabel="A"
                onPress={() => handleKey("-")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label={"°'\""}
                shiftLabel="←"
                alphaLabel="B"
                onPress={() => undefined}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="hyp"
                alphaLabel="C"
                onPress={() => undefined}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="sin"
                shiftLabel="sin⁻¹"
                alphaLabel="D"
                onPress={() => handleKey("sin(", "asin(")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="cos"
                shiftLabel="cos⁻¹"
                alphaLabel="E"
                onPress={() => handleKey("cos(", "acos(")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="tan"
                shiftLabel="tan⁻¹"
                alphaLabel="F"
                onPress={() => handleKey("tan(", "atan(")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />

              <CalcButton
                label="RCL"
                shiftLabel="STO"
                onPress={() => undefined}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="ENG"
                shiftLabel="←"
                onPress={() => undefined}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="("
                alphaLabel="X"
                onPress={() => handleKey("(")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label=")"
                shiftLabel=";"
                alphaLabel="Y"
                onPress={() => handleKey(")")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label=","
                alphaLabel="M"
                onPress={() => handleKey(",")}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
              <CalcButton
                label="M+"
                shiftLabel="M-"
                alphaLabel="M"
                onPress={() => undefined}
                type="small"
                width={scientificButtonWidth}
              scale={scale}
              />
            </View>

            <View style={[styles.grid5, { gap: numpadGap }]}>
              <CalcButton
                label="7"
                onPress={() => handleKey("7")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="8"
                onPress={() => handleKey("8")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="9"
                onPress={() => handleKey("9")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="DEL"
                shiftLabel="INS"
                onPress={() => handleKey("DEL")}
                type="accent"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="AC"
                shiftLabel="OFF"
                blueLabel="DT CL"
                onPress={() => handleKey("AC")}
                type="accent"
                width={numpadButtonWidth}
                scale={scale}
              />

              <CalcButton
                label="4"
                onPress={() => handleKey("4")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="5"
                onPress={() => handleKey("5")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="6"
                onPress={() => handleKey("6")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="×"
                onPress={() => handleKey("×")}
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="÷"
                onPress={() => handleKey("÷")}
                width={numpadButtonWidth}
                scale={scale}
              />

              <CalcButton
                label="1"
                shiftLabel="[S-SUM]"
                onPress={() => handleKey("1")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="2"
                shiftLabel="[S-VAR]"
                onPress={() => handleKey("2")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="3"
                onPress={() => handleKey("3")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="+"
                onPress={() => handleKey("+")}
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="−"
                onPress={() => handleKey("−")}
                width={numpadButtonWidth}
                scale={scale}
              />

              <CalcButton
                label="0"
                shiftLabel="Rnd"
                onPress={() => handleKey("0")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="."
                shiftLabel="Ran#"
                onPress={() => handleKey(".")}
                type="numpad"
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="×10ˣ"
                shiftLabel="π"
                onPress={() => handleKey("E", "π")}
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="Ans"
                shiftLabel="DRG▶"
                onPress={() => handleKey("Ans")}
                width={numpadButtonWidth}
                scale={scale}
              />
              <CalcButton
                label="="
                shiftLabel="%"
                onPress={() => handleKey("=")}
                width={numpadButtonWidth}
                scale={scale}
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  calculatorBody: {
    backgroundColor: "#363231",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#4f4a48",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 18,
  },
  brandingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 8,
  },
  brand: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  model: {
    color: "#a09a97",
    fontSize: 12,
    fontWeight: "600",
  },
  subtitle: {
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    opacity: 0.8,
  },
  subtitleSmall: {
    fontSize: 8,
    letterSpacing: 0,
    opacity: 0.7,
  },
  screenBezel: {
    backgroundColor: "#24211f",
    padding: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  screen: {
    backgroundColor: "#96a492",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#768573",
    padding: 6,
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: "#000",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    height: 16,
    alignItems: "center",
  },
  statusText: {
    color: "#263022",
    fontSize: 10,
    fontWeight: "700",
  },
  hiddenText: {
    opacity: 0,
  },
  expressionLine: {
    flex: 1,
    color: "#11190f",
    fontSize: 18,
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  resultLine: {
    color: "#11190f",
    textAlign: "right",
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  fractionMark: {
    transform: [{ translateY: 4 }],
    fontSize: 15,
  },
  keypad: {
    gap: 3,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    position: "relative",
    marginTop: 6,
  },
  roundGroup: {
    flexDirection: "row",
    gap: 14,
  },
  roundStack: {
    alignItems: "center",
    gap: 3,
  },
  shiftRoundLabel: {
    color: "#d5ad40",
    fontSize: 9,
    fontWeight: "700",
  },
  alphaRoundLabel: {
    color: "#cc5669",
    fontSize: 9,
    fontWeight: "700",
  },
  whiteRoundLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  modeLabelRow: {
    flexDirection: "row",
    gap: 4,
  },
  roundButton: {
    backgroundColor: "#2a2624",
    borderWidth: 1,
    borderColor: "#3a3533",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  roundActive: {
    borderColor: "#d5ad40",
    backgroundColor: "#4b3d25",
  },
  dpad: {
    position: "absolute",
    top: -4,
    left: "50%",
    backgroundColor: "#221e1d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  dpadArrow: {
    position: "absolute",
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
  },
  dpadUp: {
    top: 6,
  },
  dpadDown: {
    bottom: 6,
  },
  dpadLeft: {
    left: 8,
  },
  dpadRight: {
    right: 8,
  },
  dpadCenter: {
    backgroundColor: "#1b1817",
  },
  scientificTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  scientificPair: {
    flexDirection: "row",
    gap: 7,
  },
  grid6: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 1,
  },
  grid5: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 1,
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#4f4a48",
  },
  buttonWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  topLabelRow: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    minHeight: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shiftLabel: {
    color: "#d5ad40",
    flex: 1,
    fontWeight: "700",
    lineHeight: 8,
  },
  rightLabels: {
    flex: 1,
    alignItems: "flex-end",
  },
  alphaLabel: {
    color: "#cc5669",
    fontWeight: "700",
    lineHeight: 8,
    textAlign: "right",
  },
  blueLabel: {
    color: "#489ea8",
    fontWeight: "700",
    lineHeight: 7,
    textAlign: "right",
  },
  button: {
    width: "100%",
    borderRadius: 6,
    backgroundColor: "#2a2624",
    borderWidth: 1,
    borderColor: "#3a3533",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  numpadButton: {
    backgroundColor: "#4a4441",
    borderColor: "#59524f",
  },
  accentButton: {
    backgroundColor: "#c44961",
    borderColor: "#d66076",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ translateY: 2 }],
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
  },
});
