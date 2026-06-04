"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importStar(require("react"));
var react_native_1 = require("react-native");
var react_native_svg_1 = __importStar(require("react-native-svg"));
var react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
/* ── Exact CSS tokens ── */
var NAV_BG = 'rgba(0,0,0,0.45)';
var BORDER_COLOR = '#363636';
var ACCENT = '#8b6cef';
var PILL_RADIUS = 24;
var BTN_SIZE = 48;
var NAV_PADDING = 8;
var PANEL_RADIUS = 32;
var SLIDE_DURATION = 400;
var SLIDE_EASING = react_native_reanimated_1.Easing.bezier(0.25, 1, 0.5, 1);
var ICON_EASING = react_native_reanimated_1.Easing.bezier(0.34, 1.56, 0.64, 1);
var JELLY_DURATION = 400;
/* ── Icons (lucide style) ── */
var HomePath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Path, { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    react_1.default.createElement(react_native_svg_1.Polyline, { points: "9 22 9 12 15 12 15 22" }))); };
var DailyLogPath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Rect, { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "16", y1: "2", x2: "16", y2: "6" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "8", y1: "2", x2: "8", y2: "6" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "3", y1: "10", x2: "21", y2: "10" }))); };
var MonthlyReportPath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Path, { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    react_1.default.createElement(react_native_svg_1.Polyline, { points: "14 2 14 8 20 8" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "16", y1: "13", x2: "8", y2: "13" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "16", y1: "17", x2: "8", y2: "17" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "10", y1: "9", x2: "8", y2: "9" }))); };
var HistoryPath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Circle, { cx: "12", cy: "12", r: "10" }),
    react_1.default.createElement(react_native_svg_1.Polyline, { points: "12 6 12 12 16 14" }))); };
var AnalyticsPath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Line, { x1: "18", y1: "20", x2: "18", y2: "10" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "12", y1: "20", x2: "12", y2: "4" }),
    react_1.default.createElement(react_native_svg_1.Line, { x1: "6", y1: "20", x2: "6", y2: "14" }))); };
var ProfilePath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Path, { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    react_1.default.createElement(react_native_svg_1.Circle, { cx: "12", cy: "7", r: "4" }))); };
var MorePath = function () { return (react_1.default.createElement(react_native_svg_1.default, { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    react_1.default.createElement(react_native_svg_1.Circle, { cx: "12", cy: "5", r: "1.5" }),
    react_1.default.createElement(react_native_svg_1.Circle, { cx: "12", cy: "12", r: "1.5" }),
    react_1.default.createElement(react_native_svg_1.Circle, { cx: "12", cy: "19", r: "1.5" }))); };
var TAB_NAMES = ['TimeClock', 'DailyLog', 'MonthlyReport', 'History', 'Analytics', 'Profile', 'More'];
var ICON_PATHS = [HomePath, DailyLogPath, MonthlyReportPath, HistoryPath, AnalyticsPath, ProfilePath, MorePath];
var CustomTabBar = function (_a) {
    var _b;
    var state = _a.state, navigation = _a.navigation;
    var tabs = TAB_NAMES.map(function (name, i) { return ({ name: name, Icon: ICON_PATHS[i] }); });
    var _c = (0, react_1.useState)((_b = state.index) !== null && _b !== void 0 ? _b : 0), activeIndex = _c[0], setActiveIndex = _c[1];
    var _d = (0, react_1.useState)([]), layouts = _d[0], setLayouts = _d[1];
    /* Indicator shared values */
    var indLeft = (0, react_native_reanimated_1.useSharedValue)(0);
    var indTop = (0, react_native_reanimated_1.useSharedValue)(0);
    var indWidth = (0, react_native_reanimated_1.useSharedValue)(0);
    var indHeight = (0, react_native_reanimated_1.useSharedValue)(0);
    var indScaleX = (0, react_native_reanimated_1.useSharedValue)(1);
    var indScaleY = (0, react_native_reanimated_1.useSharedValue)(1);
    var containerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () {
            if (layouts[activeIndex]) {
                var l = layouts[activeIndex];
                indLeft.value = l.left;
                indTop.value = l.top;
                indWidth.value = l.width;
                indHeight.value = l.height;
            }
        }, 50);
        return function () { return clearTimeout(timer); };
    }, []);
    var updateIndicator = (0, react_1.useCallback)(function (index, animate) { return __awaiter(void 0, void 0, void 0, function () {
        var l, cfg;
        return __generator(this, function (_a) {
            if (!layouts[index])
                return [2 /*return*/];
            l = layouts[index];
            if (!animate) {
                indLeft.value = l.left;
                indTop.value = l.top;
                indWidth.value = l.width;
                indHeight.value = l.height;
                indScaleX.value = 1;
                indScaleY.value = 1;
                return [2 /*return*/];
            }
            cfg = { duration: SLIDE_DURATION, easing: SLIDE_EASING };
            indWidth.value = (0, react_native_reanimated_1.withTiming)(l.width, cfg);
            indHeight.value = (0, react_native_reanimated_1.withTiming)(l.height, cfg);
            indLeft.value = (0, react_native_reanimated_1.withTiming)(l.left, cfg);
            indTop.value = (0, react_native_reanimated_1.withTiming)(l.top, cfg);
            indScaleX.value = (0, react_native_reanimated_1.withSequence)((0, react_native_reanimated_1.withTiming)(1.15, { duration: 120, easing: react_native_reanimated_1.Easing.linear }), (0, react_native_reanimated_1.withTiming)(0.9, { duration: 100, easing: react_native_reanimated_1.Easing.linear }), (0, react_native_reanimated_1.withTiming)(1, { duration: 160, easing: react_native_reanimated_1.Easing.linear }));
            indScaleY.value = (0, react_native_reanimated_1.withSequence)((0, react_native_reanimated_1.withTiming)(0.85, { duration: 120, easing: react_native_reanimated_1.Easing.linear }), (0, react_native_reanimated_1.withTiming)(1.05, { duration: 100, easing: react_native_reanimated_1.Easing.linear }), (0, react_native_reanimated_1.withTiming)(1, { duration: 160, easing: react_native_reanimated_1.Easing.linear }));
            return [2 /*return*/];
        });
    }); }, [layouts]);
    (0, react_1.useEffect)(function () {
        updateIndicator(activeIndex, false);
    }, []);
    (0, react_1.useEffect)(function () {
        updateIndicator(activeIndex, true);
    }, [activeIndex, updateIndicator]);
    (0, react_1.useEffect)(function () {
        var sub = react_native_1.Dimensions.addEventListener('change', function () {
            updateIndicator(activeIndex, false);
        });
        return function () { return sub === null || sub === void 0 ? void 0 : sub.remove(); };
    }, [activeIndex, updateIndicator]);
    var animatedIndicator = (0, react_native_reanimated_1.useAnimatedStyle)(function () { return ({
        position: 'absolute',
        left: indLeft.value,
        top: indTop.value,
        width: indWidth.value,
        height: indHeight.value,
        borderRadius: PILL_RADIUS,
        backgroundColor: ACCENT,
        transform: [{ scaleX: indScaleX.value }, { scaleY: indScaleY.value }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    }); });
    return (react_1.default.createElement(react_native_1.View, { ref: containerRef, style: styles.navbar },
        react_1.default.createElement(react_native_reanimated_1.default.View, { style: animatedIndicator, pointerEvents: "none" }),
        react_1.default.createElement(react_native_1.View, { style: styles.navbarContainer }, tabs.map(function (tab, index) {
            var isFocused = activeIndex === index;
            var onPress = function () {
                if (isFocused)
                    return;
                var event = navigation.emit({ type: 'tabPress', target: tab.name, canPreventDefault: true });
                if (!event.defaultPrevented) {
                    setActiveIndex(index);
                    navigation.navigate(tab.name);
                }
            };
            return (react_1.default.createElement(react_native_1.Pressable, { key: tab.name, onPress: onPress, style: function (_a) {
                    var pressed = _a.pressed;
                    return [styles.tabWrapper, pressed && styles.tabItemPressed];
                } },
                react_1.default.createElement(react_native_1.View, { style: styles.tabItem, onLayout: function (e) {
                        var _a = e.nativeEvent.layout, x = _a.x, y = _a.y, width = _a.width, height = _a.height;
                        setLayouts(function (prev) {
                            var copy = __spreadArray([], prev, true);
                            copy[index] = { left: x, top: y, width: width, height: height };
                            return copy;
                        });
                    } },
                    react_1.default.createElement(react_native_reanimated_1.default.View, { style: [
                            styles.iconInner,
                            {
                                opacity: isFocused ? 1 : 0.4,
                                transform: [{ scale: isFocused ? 1.12 : 1 }, { translateY: isFocused ? -1 : 0 }],
                            },
                        ] },
                        react_1.default.createElement(tab.Icon, null)))));
        }))));
};
var styles = react_native_1.StyleSheet.create({
    navbar: __assign({ backgroundColor: NAV_BG, paddingVertical: NAV_PADDING, paddingHorizontal: NAV_PADDING, borderTopWidth: 1, borderTopColor: BORDER_COLOR, borderRadius: PANEL_RADIUS }, react_native_1.Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.6,
            shadowRadius: 50,
        },
        android: {
            elevation: 20,
        },
    })),
    navbarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tabWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItem: {
        height: BTN_SIZE,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: PILL_RADIUS,
    },
    tabItemPressed: {
        opacity: 0.8,
    },
    iconInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
exports.default = CustomTabBar;
