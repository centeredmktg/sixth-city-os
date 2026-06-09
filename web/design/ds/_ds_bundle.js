/* @ds-bundle: {"format":3,"namespace":"SixthCityMarketingDesignSystem_4d5a9e","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"ScoreMeter","sourcePath":"components/data/ScoreMeter.jsx"},{"name":"StatBlock","sourcePath":"components/data/StatBlock.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"1ba2367ffec5","components/core/Badge.jsx":"69b3136b4c34","components/core/Button.jsx":"7dd7bd304835","components/core/Card.jsx":"d3ecfd6db4e5","components/core/Tag.jsx":"6d46d9f8d3b9","components/data/ScoreMeter.jsx":"8e0487f05c98","components/data/StatBlock.jsx":"df9dc48d4513","components/forms/Checkbox.jsx":"d35275d142f9","components/forms/Input.jsx":"ad0e22c4136b","components/forms/Select.jsx":"1b145c30c75b","components/forms/Switch.jsx":"98bfde1e12c9","ui_kits/marketing-site/app.jsx":"87f8489ae007"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SixthCityMarketingDesignSystem_4d5a9e = window.SixthCityMarketingDesignSystem_4d5a9e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const AVATAR_CSS = `
.scm-avatar{
  --_sz:40px;
  position:relative; display:inline-flex; align-items:center; justify-content:center;
  width:var(--_sz); height:var(--_sz); border-radius:var(--radius-pill);
  font-family:var(--font-sans); font-weight:var(--fw-bold); color:#fff;
  background:var(--ink-600); overflow:visible; flex:none; user-select:none;
  font-size:calc(var(--_sz) * .38); letter-spacing:.01em;
}
.scm-avatar--square{ border-radius:var(--radius-md); }
.scm-avatar__img{ width:100%; height:100%; border-radius:inherit; object-fit:cover; display:block; }
.scm-avatar__status{
  position:absolute; right:-1px; bottom:-1px; width:30%; height:30%; min-width:8px; min-height:8px;
  border-radius:50%; border:2px solid var(--surface-card); background:var(--stone-400);
}
.scm-avatar__status--online{ background:var(--green-500); }
.scm-avatar__status--busy{ background:var(--coral-500); }
.scm-avatar__status--away{ background:var(--warning); }
/* tonal initial backgrounds */
.scm-avatar.tone-coral{ background:var(--coral-500); }
.scm-avatar.tone-orange{ background:var(--orange-500); }
.scm-avatar.tone-green{ background:var(--green-600); }
.scm-avatar.tone-ink{ background:var(--ink-700); }
.scm-avatar.tone-steel{ background:var(--heat-cool); }
`;
function injectAvatarCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-avatar-css")) return;
  const s = document.createElement("style");
  s.id = "scm-avatar-css";
  s.textContent = AVATAR_CSS;
  document.head.appendChild(s);
}
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72
};
const TONES = ["coral", "orange", "green", "ink", "steel"];
function initialsFrom(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function Avatar({
  name = "",
  src = null,
  size = "md",
  square = false,
  status = null,
  tone = null,
  className = "",
  ...rest
}) {
  injectAvatarCSS();
  useEffect(injectAvatarCSS, []);
  const px = SIZES[size] || size;
  // deterministic tone from name when not specified
  const autoTone = tone || TONES[(name.charCodeAt(0) || 0) % TONES.length];
  const cls = ["scm-avatar", square ? "scm-avatar--square" : "", !src ? `tone-${autoTone}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      "--_sz": typeof px === "number" ? px + "px" : px
    },
    title: name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    className: "scm-avatar__img",
    src: src,
    alt: name
  }) : initialsFrom(name), status && /*#__PURE__*/React.createElement("span", {
    className: `scm-avatar__status scm-avatar__status--${status}`,
    "aria-hidden": "true"
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const BADGE_CSS = `
.scm-badge{
  --_fg:var(--ink-700); --_bg:var(--stone-150); --_bd:transparent;
  display:inline-flex; align-items:center; gap:.4em; vertical-align:middle;
  font-family:var(--font-sans); font-weight:var(--fw-bold); line-height:1;
  font-size:var(--text-xs); padding:.4em .7em; border-radius:var(--radius-sm);
  border:1px solid var(--_bd); background:var(--_bg); color:var(--_fg); white-space:nowrap;
}
.scm-badge--pill{ border-radius:var(--radius-pill); }
.scm-badge--sm{ font-size:var(--text-2xs); padding:.3em .55em; }
.scm-badge__dot{ width:.5em; height:.5em; border-radius:50%; background:currentColor; }
.scm-badge__icon{ display:inline-flex; } .scm-badge__icon svg{ width:1.05em; height:1.05em; display:block; }
/* overline-style label option */
.scm-badge--over{ font-family:var(--font-condensed); font-weight:var(--fw-bold); text-transform:uppercase; letter-spacing:.08em; }

/* SOFT (tint) tones */
.scm-badge--soft.t-neutral{ --_bg:var(--stone-150); --_fg:var(--stone-600); }
.scm-badge--soft.t-coral{ --_bg:var(--coral-100); --_fg:var(--coral-700); }
.scm-badge--soft.t-orange{ --_bg:var(--orange-100); --_fg:var(--orange-700); }
.scm-badge--soft.t-green{ --_bg:var(--green-100); --_fg:var(--green-700); }
.scm-badge--soft.t-info{ --_bg:var(--info-bg); --_fg:var(--info); }
.scm-badge--soft.t-warning{ --_bg:var(--warning-bg); --_fg:#8a5a00; }
.scm-badge--soft.t-danger{ --_bg:var(--danger-bg); --_fg:var(--danger); }
.scm-badge--soft.t-hot{ --_bg:var(--heat-hot-bg); --_fg:var(--coral-700); }
.scm-badge--soft.t-warm{ --_bg:var(--heat-warm-bg); --_fg:var(--orange-700); }
.scm-badge--soft.t-medium{ --_bg:var(--heat-medium-bg); --_fg:#8a5a00; }
.scm-badge--soft.t-cool{ --_bg:var(--heat-cool-bg); --_fg:var(--info); }
.scm-badge--soft.t-cold{ --_bg:var(--heat-cold-bg); --_fg:var(--stone-600); }

/* SOLID tones */
.scm-badge--solid{ --_fg:#fff; }
.scm-badge--solid.t-neutral{ --_bg:var(--stone-500); }
.scm-badge--solid.t-coral{ --_bg:var(--coral-500); }
.scm-badge--solid.t-orange{ --_bg:var(--orange-500); }
.scm-badge--solid.t-green{ --_bg:var(--green-500); }
.scm-badge--solid.t-info{ --_bg:var(--info); }
.scm-badge--solid.t-warning{ --_bg:var(--warning); }
.scm-badge--solid.t-danger{ --_bg:var(--danger); }
.scm-badge--solid.t-hot{ --_bg:var(--heat-hot); }
.scm-badge--solid.t-warm{ --_bg:var(--heat-warm); }
.scm-badge--solid.t-medium{ --_bg:var(--heat-medium); }
.scm-badge--solid.t-cool{ --_bg:var(--heat-cool); }
.scm-badge--solid.t-cold{ --_bg:var(--heat-cold); }

/* OUTLINE tones */
.scm-badge--outline{ --_bg:transparent; }
.scm-badge--outline.t-neutral{ --_bd:var(--border-default); --_fg:var(--stone-600); }
.scm-badge--outline.t-coral{ --_bd:var(--coral-300); --_fg:var(--coral-700); }
.scm-badge--outline.t-green{ --_bd:var(--green-200); --_fg:var(--green-700); }
.scm-badge--outline.t-info{ --_bd:#bcd0e0; --_fg:var(--info); }
`;
function injectBadgeCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-badge-css")) return;
  const s = document.createElement("style");
  s.id = "scm-badge-css";
  s.textContent = BADGE_CSS;
  document.head.appendChild(s);
}
function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  pill = false,
  dot = false,
  overline = false,
  icon = null,
  className = "",
  children,
  ...rest
}) {
  injectBadgeCSS();
  useEffect(injectBadgeCSS, []);
  const cls = ["scm-badge", `scm-badge--${variant}`, `t-${tone}`, size === "sm" ? "scm-badge--sm" : "", pill ? "scm-badge--pill" : "", overline ? "scm-badge--over" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "scm-badge__dot",
    "aria-hidden": "true"
  }), icon && /*#__PURE__*/React.createElement("span", {
    className: "scm-badge__icon",
    "aria-hidden": "true"
  }, icon), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const BUTTON_CSS = `
.scm-btn{
  --_bg:var(--coral-500); --_fg:#fff; --_bd:transparent; --_bgh:var(--coral-600); --_bgp:var(--coral-700);
  display:inline-flex; align-items:center; justify-content:center; gap:.55em;
  font-family:var(--font-sans); font-weight:var(--fw-bold); letter-spacing:.005em;
  border:var(--border-w-2) solid var(--_bd); background:var(--_bg); color:var(--_fg);
  border-radius:var(--radius-md); cursor:pointer; white-space:nowrap;
  transition:background var(--tap-transition), transform var(--tap-transition), box-shadow var(--tap-transition), border-color var(--tap-transition);
  -webkit-tap-highlight-color:transparent; text-decoration:none;
}
.scm-btn:hover{ background:var(--_bgh); }
.scm-btn:active{ background:var(--_bgp); transform:translateY(1px); }
.scm-btn:focus-visible{ outline:none; box-shadow:var(--ring); }
.scm-btn[disabled]{ opacity:.45; cursor:not-allowed; pointer-events:none; }
.scm-btn--md{ height:var(--control-h-md); padding:0 18px; font-size:var(--text-md); }
.scm-btn--sm{ height:var(--control-h-sm); padding:0 13px; font-size:var(--text-sm); border-radius:var(--radius-sm); }
.scm-btn--lg{ height:var(--control-h-lg); padding:0 26px; font-size:var(--text-base); }
.scm-btn--block{ width:100%; }
.scm-btn__icon{ display:inline-flex; }
.scm-btn__icon svg{ width:1.15em; height:1.15em; display:block; }
/* variants */
.scm-btn--positive{ --_bg:var(--green-500); --_bgh:var(--green-600); --_bgp:var(--green-700); }
.scm-btn--dark{ --_bg:var(--ink-700); --_bgh:var(--ink-800); --_bgp:var(--ink-900); }
.scm-btn--danger{ --_bg:var(--danger); --_bgh:#a8281f; --_bgp:#8c211a; }
.scm-btn--secondary{ --_bg:var(--white); --_fg:var(--ink-800); --_bd:var(--border-default); --_bgh:var(--stone-50); --_bgp:var(--stone-100); }
.scm-btn--secondary:hover{ border-color:var(--border-strong); }
.scm-btn--ghost{ --_bg:transparent; --_fg:var(--coral-600); --_bgh:var(--coral-50); --_bgp:var(--coral-100); }
.scm-btn--ghost.scm-btn--neutral{ --_fg:var(--ink-700); --_bgh:var(--stone-100); --_bgp:var(--stone-150); }
.scm-btn--spin .scm-btn__icon svg{ animation:scm-btn-spin .7s linear infinite; }
@keyframes scm-btn-spin{ to{ transform:rotate(360deg); } }
`;
function injectButtonCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-btn-css")) return;
  const s = document.createElement("style");
  s.id = "scm-btn-css";
  s.textContent = BUTTON_CSS;
  document.head.appendChild(s);
}
function Button({
  variant = "primary",
  size = "md",
  icon = null,
  iconRight = null,
  block = false,
  neutral = false,
  loading = false,
  as = "button",
  className = "",
  children,
  ...rest
}) {
  useEffect(injectButtonCSS, []);
  injectButtonCSS();
  const Tag = as;
  const cls = ["scm-btn", `scm-btn--${variant}`, `scm-btn--${size}`, block ? "scm-btn--block" : "", neutral ? "scm-btn--neutral" : "", loading ? "scm-btn--spin" : "", className].filter(Boolean).join(" ");
  const lead = loading ? /*#__PURE__*/React.createElement("span", {
    className: "scm-btn__icon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-6.2-8.5"
  }))) : icon ? /*#__PURE__*/React.createElement("span", {
    className: "scm-btn__icon",
    "aria-hidden": "true"
  }, icon) : null;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    disabled: Tag === "button" ? rest.disabled : undefined
  }, rest), lead, children != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-btn__label"
  }, children), iconRight && /*#__PURE__*/React.createElement("span", {
    className: "scm-btn__icon",
    "aria-hidden": "true"
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const CARD_CSS = `
.scm-card{
  background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm);
  overflow:hidden; display:flex; flex-direction:column; color:var(--text-body);
  transition:box-shadow var(--tap-transition), transform var(--tap-transition), border-color var(--tap-transition);
}
.scm-card--flat{ box-shadow:none; }
.scm-card--cream{ background:var(--surface-cream); border-color:var(--stone-200); }
.scm-card--inverse{ background:var(--surface-inverse); border-color:transparent; color:var(--cream); }
.scm-card--accent{ border-top:3px solid var(--coral-500); }
.scm-card--interactive{ cursor:pointer; }
.scm-card--interactive:hover{ box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--border-default); }
.scm-card--interactive:active{ transform:translateY(0); }
.scm-card__head{
  display:flex; align-items:center; gap:var(--space-3);
  padding:var(--space-4) var(--space-5); border-bottom:1px solid var(--border-subtle);
}
.scm-card__head-text{ min-width:0; }
.scm-card__title{ font-family:var(--font-display); font-weight:var(--fw-extra); font-size:var(--text-lg); color:inherit; margin:0; line-height:1.2; }
.scm-card--inverse .scm-card__title{ color:#fff; }
.scm-card__sub{ font-size:var(--text-sm); color:var(--text-muted); margin:2px 0 0; }
.scm-card--inverse .scm-card__sub{ color:rgba(255,255,255,.7); }
.scm-card__head-action{ margin-left:auto; }
.scm-card__body{ padding:var(--space-5); flex:1; }
.scm-card__body--snug{ padding:var(--space-4); }
.scm-card__foot{
  padding:var(--space-4) var(--space-5); border-top:1px solid var(--border-subtle);
  display:flex; align-items:center; gap:var(--space-3); background:var(--stone-50);
}
.scm-card--inverse .scm-card__foot{ background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.12); }
`;
function injectCardCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-card-css")) return;
  const s = document.createElement("style");
  s.id = "scm-card-css";
  s.textContent = CARD_CSS;
  document.head.appendChild(s);
}
function Card({
  variant = "default",
  accent = false,
  interactive = false,
  title = null,
  subtitle = null,
  media = null,
  headAction = null,
  footer = null,
  snug = false,
  className = "",
  children,
  ...rest
}) {
  injectCardCSS();
  useEffect(injectCardCSS, []);
  const cls = ["scm-card", variant !== "default" ? `scm-card--${variant}` : "", accent ? "scm-card--accent" : "", interactive ? "scm-card--interactive" : "", className].filter(Boolean).join(" ");
  const hasHead = title != null || media != null || headAction != null;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), hasHead && /*#__PURE__*/React.createElement("div", {
    className: "scm-card__head"
  }, media, (title != null || subtitle != null) && /*#__PURE__*/React.createElement("div", {
    className: "scm-card__head-text"
  }, title != null && /*#__PURE__*/React.createElement("p", {
    className: "scm-card__title"
  }, title), subtitle != null && /*#__PURE__*/React.createElement("p", {
    className: "scm-card__sub"
  }, subtitle)), headAction && /*#__PURE__*/React.createElement("div", {
    className: "scm-card__head-action"
  }, headAction)), children != null && /*#__PURE__*/React.createElement("div", {
    className: "scm-card__body" + (snug ? " scm-card__body--snug" : "")
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "scm-card__foot"
  }, footer));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const TAG_CSS = `
.scm-tag{
  display:inline-flex; align-items:center; gap:.45em;
  font-family:var(--font-sans); font-weight:var(--fw-semibold); font-size:var(--text-sm);
  padding:.32em .65em; border-radius:var(--radius-sm);
  background:var(--stone-100); color:var(--ink-700); border:1px solid var(--border-subtle);
  white-space:nowrap; max-width:100%;
}
.scm-tag--coral{ background:var(--coral-50); color:var(--coral-700); border-color:var(--coral-200); }
.scm-tag__label{ overflow:hidden; text-overflow:ellipsis; }
.scm-tag__x{
  display:inline-flex; align-items:center; justify-content:center;
  width:1.15em; height:1.15em; margin-right:-.15em; border-radius:50%;
  background:transparent; border:0; cursor:pointer; color:inherit; opacity:.6;
  font-size:1.1em; line-height:1; padding:0; transition:opacity var(--tap-transition), background var(--tap-transition);
}
.scm-tag__x:hover{ opacity:1; background:rgba(0,0,0,.08); }
.scm-tag__x:focus-visible{ outline:none; box-shadow:var(--ring); }
.scm-tag__dot{ width:.5em; height:.5em; border-radius:50%; background:currentColor; flex:none; }
`;
function injectTagCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-tag-css")) return;
  const s = document.createElement("style");
  s.id = "scm-tag-css";
  s.textContent = TAG_CSS;
  document.head.appendChild(s);
}
function Tag({
  tone = "neutral",
  dot = false,
  onRemove = null,
  className = "",
  children,
  ...rest
}) {
  injectTagCSS();
  useEffect(injectTagCSS, []);
  const cls = ["scm-tag", tone === "coral" ? "scm-tag--coral" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "scm-tag__dot",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "scm-tag__label"
  }, children), onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "scm-tag__x",
    "aria-label": "Remove",
    onClick: onRemove
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/data/ScoreMeter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const SCORE_CSS = `
.scm-score{ font-family:var(--font-sans); color:var(--text-body); }
/* ---- ring ---- */
.scm-score--ring{ display:inline-flex; flex-direction:column; align-items:center; gap:6px; }
.scm-score__ring{ position:relative; display:inline-grid; place-items:center; }
.scm-score__ring svg{ transform:rotate(-90deg); display:block; }
.scm-score__ring-track{ stroke:var(--stone-200); }
.scm-score__num{
  position:absolute; display:flex; flex-direction:column; align-items:center; line-height:1;
  font-family:var(--font-condensed); font-weight:var(--fw-extra); color:var(--text-strong);
}
.scm-score__num small{ font-family:var(--font-sans); font-weight:var(--fw-bold); color:var(--text-subtle); letter-spacing:.1em; text-transform:uppercase; }
.scm-score__caption{ font-family:var(--font-condensed); font-weight:var(--fw-bold); text-transform:uppercase; letter-spacing:.1em; font-size:var(--text-xs); }
/* ---- bar ---- */
.scm-score--bar{ display:flex; flex-direction:column; gap:6px; min-width:140px; }
.scm-score__bar-head{ display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.scm-score__bar-val{ font-family:var(--font-condensed); font-weight:var(--fw-extra); font-size:var(--text-xl); color:var(--text-strong); line-height:1; }
.scm-score__bar-tier{ font-family:var(--font-condensed); font-weight:var(--fw-bold); text-transform:uppercase; letter-spacing:.08em; font-size:var(--text-xs); }
.scm-score__track{ height:8px; border-radius:var(--radius-pill); background:var(--stone-200); overflow:hidden; }
.scm-score__fill{ height:100%; border-radius:var(--radius-pill); transition:width .5s cubic-bezier(.4,0,.2,1); }
`;
function injectScoreCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-score-css")) return;
  const s = document.createElement("style");
  s.id = "scm-score-css";
  s.textContent = SCORE_CSS;
  document.head.appendChild(s);
}
function tierFor(score) {
  if (score >= 90) return {
    key: "hot",
    label: "Hot",
    color: "var(--heat-hot)"
  };
  if (score >= 70) return {
    key: "warm",
    label: "Warm",
    color: "var(--heat-warm)"
  };
  if (score >= 50) return {
    key: "medium",
    label: "Medium",
    color: "var(--heat-medium)"
  };
  if (score >= 25) return {
    key: "cool",
    label: "Cool",
    color: "var(--heat-cool)"
  };
  return {
    key: "cold",
    label: "Cold",
    color: "var(--heat-cold)"
  };
}
function ScoreMeter({
  score = 0,
  max = 100,
  variant = "ring",
  size = 96,
  showTier = true,
  label = null,
  color = null,
  className = "",
  ...rest
}) {
  injectScoreCSS();
  useEffect(injectScoreCSS, []);
  const pct = Math.max(0, Math.min(1, score / max));
  const tier = tierFor(score / max * 100);
  const stroke = color || tier.color;
  if (variant === "bar") {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ["scm-score", "scm-score--bar", className].filter(Boolean).join(" ")
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "scm-score__bar-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "scm-score__bar-val"
    }, score, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '.6em',
        color: 'var(--text-subtle)'
      }
    }, "/", max)), showTier && /*#__PURE__*/React.createElement("span", {
      className: "scm-score__bar-tier",
      style: {
        color: stroke
      }
    }, label || tier.label)), /*#__PURE__*/React.createElement("div", {
      className: "scm-score__track"
    }, /*#__PURE__*/React.createElement("div", {
      className: "scm-score__fill",
      style: {
        width: pct * 100 + "%",
        background: stroke
      }
    })));
  }
  const sw = Math.max(6, Math.round(size * 0.1));
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["scm-score", "scm-score--ring", className].filter(Boolean).join(" ")
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "scm-score__ring",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("circle", {
    className: "scm-score__ring-track",
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    strokeWidth: sw
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: stroke,
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeDasharray: circ,
    strokeDashoffset: circ * (1 - pct),
    style: {
      transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "scm-score__num",
    style: {
      fontSize: size * 0.34
    }
  }, score)), showTier && /*#__PURE__*/React.createElement("span", {
    className: "scm-score__caption",
    style: {
      color: stroke
    }
  }, label || tier.label));
}
Object.assign(__ds_scope, { ScoreMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ScoreMeter.jsx", error: String((e && e.message) || e) }); }

// components/data/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const STAT_CSS = `
.scm-statblock{ font-family:var(--font-sans); display:flex; flex-direction:column; gap:6px; }
.scm-statblock__label{
  font-family:var(--font-condensed); font-weight:var(--fw-bold); text-transform:uppercase;
  letter-spacing:var(--ls-overline); font-size:var(--text-sm); color:var(--coral-600);
  line-height:1.1;
}
.scm-statblock--muted .scm-statblock__label{ color:var(--text-subtle); }
.scm-statblock__value{
  font-family:var(--font-condensed); font-weight:var(--fw-extra); line-height:1;
  letter-spacing:-.01em; color:var(--text-strong); font-size:var(--text-5xl);
  display:flex; align-items:baseline; gap:.06em;
}
.scm-statblock--sm .scm-statblock__value{ font-size:var(--text-3xl); }
.scm-statblock--lg .scm-statblock__value{ font-size:var(--text-6xl); }
.scm-statblock__unit{ color:var(--coral-500); font-size:.62em; }
.scm-statblock__caption{ font-size:var(--text-sm); color:var(--text-muted); margin-top:2px; }
.scm-statblock__delta{
  display:inline-flex; align-items:center; gap:.25em; font-family:var(--font-sans);
  font-weight:var(--fw-bold); font-size:var(--text-sm); margin-top:4px;
}
.scm-statblock__delta--up{ color:var(--green-600); }
.scm-statblock__delta--down{ color:var(--danger); }
.scm-statblock__delta svg{ width:1em; height:1em; }
.scm-statblock--inverse .scm-statblock__value{ color:#fff; }
.scm-statblock--inverse .scm-statblock__label{ color:var(--orange-400); }
.scm-statblock--inverse .scm-statblock__caption{ color:rgba(255,255,255,.7); }
`;
function injectStatCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-stat-css")) return;
  const s = document.createElement("style");
  s.id = "scm-stat-css";
  s.textContent = STAT_CSS;
  document.head.appendChild(s);
}
function StatBlock({
  value,
  unit = null,
  label = null,
  caption = null,
  delta = null,
  size = "md",
  inverse = false,
  muted = false,
  className = "",
  ...rest
}) {
  injectStatCSS();
  useEffect(injectStatCSS, []);
  const cls = ["scm-statblock", size !== "md" ? `scm-statblock--${size}` : "", inverse ? "scm-statblock--inverse" : "", muted ? "scm-statblock--muted" : "", className].filter(Boolean).join(" ");
  const deltaUp = typeof delta === "number" ? delta >= 0 : delta && delta.dir !== "down";
  const deltaText = delta == null ? null : typeof delta === "number" ? (delta >= 0 ? "+" : "") + delta + "%" : delta.text;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), label != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-statblock__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "scm-statblock__value"
  }, value, unit != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-statblock__unit"
  }, unit)), caption != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-statblock__caption"
  }, caption), deltaText != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-statblock__delta " + (deltaUp ? "scm-statblock__delta--up" : "scm-statblock__delta--down")
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, deltaUp ? /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7-7 7 7"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12l7 7 7-7"
  })), deltaText));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const CHECK_CSS = `
.scm-check{ display:inline-flex; align-items:flex-start; gap:.6em; cursor:pointer; font-family:var(--font-sans); font-size:var(--text-md); color:var(--ink-800); user-select:none; }
.scm-check--disabled{ opacity:.5; cursor:not-allowed; }
.scm-check__input{ position:absolute; opacity:0; width:0; height:0; }
.scm-check__box{
  flex:none; width:20px; height:20px; margin-top:1px; border-radius:var(--radius-sm);
  border:var(--border-w-2) solid var(--border-strong); background:var(--white);
  display:inline-flex; align-items:center; justify-content:center; color:#fff;
  transition:background var(--tap-transition), border-color var(--tap-transition);
}
.scm-check--radio .scm-check__box{ border-radius:var(--radius-pill); }
.scm-check__box svg{ width:14px; height:14px; opacity:0; transform:scale(.6); transition:opacity var(--tap-transition), transform var(--tap-transition); }
.scm-check__dot{ width:8px; height:8px; border-radius:50%; background:#fff; opacity:0; transform:scale(.4); transition:opacity var(--tap-transition), transform var(--tap-transition); }
.scm-check__input:checked + .scm-check__box{ background:var(--coral-500); border-color:var(--coral-500); }
.scm-check__input:checked + .scm-check__box svg,
.scm-check__input:checked + .scm-check__box .scm-check__dot{ opacity:1; transform:scale(1); }
.scm-check__input:focus-visible + .scm-check__box{ box-shadow:var(--ring); }
.scm-check__text{ line-height:1.35; }
.scm-check__desc{ display:block; font-size:var(--text-sm); color:var(--text-muted); font-weight:var(--fw-regular); margin-top:1px; }
`;
function injectCheckCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-check-css")) return;
  const s = document.createElement("style");
  s.id = "scm-check-css";
  s.textContent = CHECK_CSS;
  document.head.appendChild(s);
}
function Checkbox({
  label = null,
  description = null,
  radio = false,
  disabled = false,
  className = "",
  ...rest
}) {
  injectCheckCSS();
  useEffect(injectCheckCSS, []);
  const cls = ["scm-check", radio ? "scm-check--radio" : "", disabled ? "scm-check--disabled" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: radio ? "radio" : "checkbox",
    className: "scm-check__input",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "scm-check__box",
    "aria-hidden": "true"
  }, radio ? /*#__PURE__*/React.createElement("span", {
    className: "scm-check__dot"
  }) : /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), (label != null || description != null) && /*#__PURE__*/React.createElement("span", {
    className: "scm-check__text"
  }, label, description != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-check__desc"
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect,
  useId
} = React;
const FIELD_CSS = `
.scm-field{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.scm-field__label{ font-size:var(--text-sm); font-weight:var(--fw-bold); color:var(--ink-800); }
.scm-field__label .req{ color:var(--coral-500); margin-left:2px; }
.scm-field__hint{ font-size:var(--text-xs); color:var(--text-muted); }
.scm-field__err{ font-size:var(--text-xs); color:var(--danger); font-weight:var(--fw-semibold); }
.scm-input{
  display:flex; align-items:center; gap:.55em;
  background:var(--white); border:var(--border-w) solid var(--border-default);
  border-radius:var(--radius-md); padding:0 12px; height:var(--control-h-md);
  transition:border-color var(--tap-transition), box-shadow var(--tap-transition);
}
.scm-input--sm{ height:var(--control-h-sm); border-radius:var(--radius-sm); }
.scm-input--lg{ height:var(--control-h-lg); }
.scm-input:focus-within{ border-color:var(--border-focus); box-shadow:var(--ring); }
.scm-input--err{ border-color:var(--danger); }
.scm-input--err:focus-within{ box-shadow:0 0 0 3px rgba(193,47,42,.25); }
.scm-input--disabled{ background:var(--stone-100); color:var(--text-subtle); pointer-events:none; }
.scm-input__el{
  flex:1; min-width:0; border:0; outline:none; background:transparent;
  font-family:inherit; font-size:var(--text-md); color:var(--ink-900); height:100%;
}
.scm-input__el::placeholder{ color:var(--stone-400); }
.scm-input__adorn{ display:inline-flex; align-items:center; color:var(--stone-500); flex:none; }
.scm-input__adorn svg{ width:1.1em; height:1.1em; display:block; }
.scm-input__affix{ color:var(--text-muted); font-size:var(--text-sm); font-weight:var(--fw-semibold); flex:none; }
`;
function injectFieldCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-field-css")) return;
  const s = document.createElement("style");
  s.id = "scm-field-css";
  s.textContent = FIELD_CSS;
  document.head.appendChild(s);
}
function Input({
  label = null,
  hint = null,
  error = null,
  size = "md",
  icon = null,
  prefix = null,
  suffix = null,
  required = false,
  disabled = false,
  id,
  className = "",
  ...rest
}) {
  injectFieldCSS();
  useEffect(injectFieldCSS, []);
  const autoId = useId();
  const fieldId = id || autoId;
  const boxCls = ["scm-input", size !== "md" ? `scm-input--${size}` : "", error ? "scm-input--err" : "", disabled ? "scm-input--disabled" : ""].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: ["scm-field", className].filter(Boolean).join(" ")
  }, label != null && /*#__PURE__*/React.createElement("label", {
    className: "scm-field__label",
    htmlFor: fieldId
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: boxCls
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "scm-input__adorn",
    "aria-hidden": "true"
  }, icon), prefix && /*#__PURE__*/React.createElement("span", {
    className: "scm-input__affix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: "scm-input__el",
    disabled: disabled,
    "aria-invalid": !!error
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "scm-input__affix"
  }, suffix)), error ? /*#__PURE__*/React.createElement("span", {
    className: "scm-field__err"
  }, error) : hint != null ? /*#__PURE__*/React.createElement("span", {
    className: "scm-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect,
  useId
} = React;
const SELECT_CSS = `
.scm-select{ position:relative; display:flex; align-items:center; }
.scm-select__el{
  appearance:none; -webkit-appearance:none; width:100%;
  font-family:var(--font-sans); font-size:var(--text-md); color:var(--ink-900);
  background:var(--white); border:var(--border-w) solid var(--border-default);
  border-radius:var(--radius-md); height:var(--control-h-md); padding:0 38px 0 12px; cursor:pointer;
  transition:border-color var(--tap-transition), box-shadow var(--tap-transition);
}
.scm-select__el--sm{ height:var(--control-h-sm); border-radius:var(--radius-sm); font-size:var(--text-sm); }
.scm-select__el--lg{ height:var(--control-h-lg); }
.scm-select__el:focus-visible{ outline:none; border-color:var(--border-focus); box-shadow:var(--ring); }
.scm-select__el--err{ border-color:var(--danger); }
.scm-select__el:disabled{ background:var(--stone-100); color:var(--text-subtle); cursor:not-allowed; }
.scm-select__chev{
  position:absolute; right:12px; pointer-events:none; color:var(--stone-500);
  display:inline-flex;
}
.scm-select__chev svg{ width:16px; height:16px; display:block; }
`;
function injectSelectCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-select-css")) return;
  const s = document.createElement("style");
  s.id = "scm-select-css";
  s.textContent = SELECT_CSS;
  document.head.appendChild(s);
}
function Select({
  label = null,
  hint = null,
  error = null,
  size = "md",
  options = null,
  placeholder = null,
  required = false,
  id,
  className = "",
  children,
  ...rest
}) {
  injectSelectCSS();
  if (typeof document !== "undefined" && !document.getElementById("scm-field-css")) {
    // reuse field label styles if Input loaded; otherwise add minimal labels
    const s = document.createElement("style");
    s.id = "scm-field-css-fallback";
    s.textContent = ".scm-field{display:flex;flex-direction:column;gap:6px;font-family:var(--font-sans)}.scm-field__label{font-size:var(--text-sm);font-weight:var(--fw-bold);color:var(--ink-800)}.scm-field__label .req{color:var(--coral-500);margin-left:2px}.scm-field__hint{font-size:var(--text-xs);color:var(--text-muted)}.scm-field__err{font-size:var(--text-xs);color:var(--danger);font-weight:var(--fw-semibold)}";
    if (!document.getElementById("scm-field-css-fallback")) document.head.appendChild(s);
  }
  useEffect(injectSelectCSS, []);
  const autoId = useId();
  const fieldId = id || autoId;
  const elCls = ["scm-select__el", size !== "md" ? `scm-select__el--${size}` : "", error ? "scm-select__el--err" : ""].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: ["scm-field", className].filter(Boolean).join(" ")
  }, label != null && /*#__PURE__*/React.createElement("label", {
    className: "scm-field__label",
    htmlFor: fieldId
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: "scm-select"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: elCls,
    "aria-invalid": !!error
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options ? options.map(o => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  }) : children), /*#__PURE__*/React.createElement("span", {
    className: "scm-select__chev",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })))), error ? /*#__PURE__*/React.createElement("span", {
    className: "scm-field__err"
  }, error) : hint != null ? /*#__PURE__*/React.createElement("span", {
    className: "scm-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect
} = React;
const SWITCH_CSS = `
.scm-switch{ display:inline-flex; align-items:center; gap:.65em; cursor:pointer; font-family:var(--font-sans); font-size:var(--text-md); color:var(--ink-800); user-select:none; }
.scm-switch--disabled{ opacity:.5; cursor:not-allowed; }
.scm-switch__input{ position:absolute; opacity:0; width:0; height:0; }
.scm-switch__track{
  flex:none; width:40px; height:23px; border-radius:var(--radius-pill);
  background:var(--stone-300); padding:2px; transition:background var(--tap-transition);
}
.scm-switch--sm .scm-switch__track{ width:34px; height:20px; }
.scm-switch__thumb{
  width:19px; height:19px; border-radius:50%; background:#fff; box-shadow:var(--shadow-sm);
  transform:translateX(0); transition:transform var(--tap-transition);
}
.scm-switch--sm .scm-switch__thumb{ width:16px; height:16px; }
.scm-switch__input:checked + .scm-switch__track{ background:var(--coral-500); }
.scm-switch__input:checked + .scm-switch__track .scm-switch__thumb{ transform:translateX(17px); }
.scm-switch--sm .scm-switch__input:checked + .scm-switch__track .scm-switch__thumb{ transform:translateX(14px); }
.scm-switch__input:focus-visible + .scm-switch__track{ box-shadow:var(--ring); }
`;
function injectSwitchCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("scm-switch-css")) return;
  const s = document.createElement("style");
  s.id = "scm-switch-css";
  s.textContent = SWITCH_CSS;
  document.head.appendChild(s);
}
function Switch({
  label = null,
  size = "md",
  disabled = false,
  className = "",
  ...rest
}) {
  injectSwitchCSS();
  useEffect(injectSwitchCSS, []);
  const cls = ["scm-switch", size === "sm" ? "scm-switch--sm" : "", disabled ? "scm-switch--disabled" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    className: "scm-switch__input",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "scm-switch__track",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "scm-switch__thumb"
  })), label != null && /*#__PURE__*/React.createElement("span", {
    className: "scm-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/app.jsx
try { (() => {
/* Sixth City Marketing — marketing homepage recreation.
   Composed from the design-system components. */
const {
  useState
} = React;
let Button, Input, StatBlock, Avatar, Badge;

/* ---- inline icons (Lucide-style 2px stroke — substitute for the site's custom PNG icons) ---- */
const Ico = {
  phone: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
  })),
  arrow: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  })),
  check: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })),
  shield: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  })),
  search: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  target: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1.5",
    fill: "currentColor"
  })),
  layout: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 9h18M9 21V9"
  })),
  share: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "5",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "19",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"
  }))
};
const NAV = ["SEO", "PPC", "Web Design", "Industries", "Our Work", "About", "Contact"];
function Nav() {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav ctr"
  }, /*#__PURE__*/React.createElement("img", {
    className: "nav__logo",
    src: "../../assets/logo-knockout.png",
    alt: "Sixth City Marketing"
  }), /*#__PURE__*/React.createElement("div", {
    className: "nav__links"
  }, NAV.map(n => /*#__PURE__*/React.createElement("a", {
    key: n,
    href: "#"
  }, n)), /*#__PURE__*/React.createElement("span", {
    className: "nav__phone"
  }, Ico.phone, " 888-704-0961")));
}
function LeadForm() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  if (sent) {
    return /*#__PURE__*/React.createElement("div", {
      className: "lead"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lead__ok"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ring"
    }, Ico.check), /*#__PURE__*/React.createElement("h3", null, "You're all set!"), /*#__PURE__*/React.createElement("p", null, "We'll send a custom review of your site", email ? /*#__PURE__*/React.createElement(React.Fragment, null, " to ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "#fff"
      }
    }, email)) : "", " within one business day."), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setSent(false),
      style: {
        color: "#fff"
      }
    }, "Submit another")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "lead"
  }, /*#__PURE__*/React.createElement("h3", null, "Free Website Review"), /*#__PURE__*/React.createElement("p", {
    className: "k"
  }, "Learn why your visitors aren't converting, and we'll build a custom marketing strategy to drive more leads."), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    required: true,
    placeholder: "Jane Marketer"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    required: true,
    type: "email",
    placeholder: "jane@company.com",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Phone number",
    placeholder: "(216) 555-0142"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Website URL",
    required: true,
    prefix: "https://",
    placeholder: "yourcompany.com"
  }), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    variant: "positive",
    size: "lg",
    block: true,
    icon: Ico.check,
    style: {
      marginTop: 4
    }
  }, "Review My Site")), /*#__PURE__*/React.createElement("div", {
    className: "lead__priv"
  }, Ico.shield, " 100% Privacy Guaranteed."));
}
function Hero() {
  return /*#__PURE__*/React.createElement("header", {
    className: "hero"
  }, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement("div", {
    className: "hero__inner ctr"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "hero__anniv"
  }, "\u2605 Celebrating 15 Years \xB7 2010\u20132025"), /*#__PURE__*/React.createElement("h1", null, "We're an ROI-Focused SEO Agency Determined to Generate Real Results"), /*#__PURE__*/React.createElement("p", {
    className: "hero__sub"
  }, "Your marketing strategy should be driving more leads, sales, and ROI \u2014 not just traffic. Since 2010 we've delivered SEO, PPC, CRO, and web design that stands out on search engines and now on AI platforms, too."), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    size: "lg",
    iconRight: Ico.arrow
  }, "Let Us Future-Proof Your Marketing")), /*#__PURE__*/React.createElement(LeadForm, null)));
}
const SERVICES = [{
  icon: Ico.search,
  t: "SEO & AI Search Services",
  d: "Rank on Google and surface in ChatGPT, Claude & Perplexity with strategies built for the future of search."
}, {
  icon: Ico.target,
  t: "Pay-Per-Click Marketing",
  d: "Google, Bing & social campaigns optimized for ROI — we manage $2M+ in spend across 25+ clients."
}, {
  icon: Ico.layout,
  t: "Website Design & CRO",
  d: "WordPress and Shopify builds engineered to convert visitors into qualified leads."
}, {
  icon: Ico.share,
  t: "Social Media Marketing",
  d: "Paid and organic social that builds your brand and feeds your pipeline."
}];
function Services() {
  return /*#__PURE__*/React.createElement("section", {
    className: "services"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ctr"
  }, /*#__PURE__*/React.createElement("h2", null, "Services We Offer to Drive Your Growth"), /*#__PURE__*/React.createElement("p", {
    className: "lead-in"
  }, "A customized mix of services \u2014 based on your goals and budget \u2014 with a proven record of success."), /*#__PURE__*/React.createElement("div", {
    className: "svc-grid"
  }, SERVICES.map(s => /*#__PURE__*/React.createElement("div", {
    className: "svc",
    key: s.t
  }, /*#__PURE__*/React.createElement("div", {
    className: "svc__icon"
  }, s.icon), /*#__PURE__*/React.createElement("h4", null, s.t), /*#__PURE__*/React.createElement("p", null, s.d), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Learn more ", Ico.arrow))))));
}
const RESULTS = [{
  label: "Organic Traffic",
  value: "540",
  unit: "%",
  caption: "TYKMA Electrox — SEO & web design"
}, {
  label: "Overall Leads",
  value: "135",
  unit: "%",
  caption: "Kent State University — SEO & PPC"
}, {
  label: "Monthly Inquiries",
  value: "543",
  unit: "%",
  caption: "Valco Tool & Die — SEO & CRO"
}, {
  label: "Conversion Rate",
  value: "90",
  unit: "%",
  caption: "University Commons — web & social"
}];
function Results() {
  return /*#__PURE__*/React.createElement("section", {
    className: "results"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ctr"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Proven Outcomes"), /*#__PURE__*/React.createElement("h2", null, "Real Marketing Strategies That Yielded Real Results"), /*#__PURE__*/React.createElement("div", {
    className: "res-grid"
  }, RESULTS.map(r => /*#__PURE__*/React.createElement("div", {
    className: "res",
    key: r.label
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: r.label,
    value: r.value,
    unit: r.unit,
    caption: r.caption
  })))), /*#__PURE__*/React.createElement("div", {
    className: "quote"
  }, /*#__PURE__*/React.createElement("p", null, "\"Other companies just waste ad spend, while Sixth City Marketing makes use of every penny. I've seen a massive improvement in the quality of leads, website visitors, and click-through rate.\""), /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Jennifer Hristovski",
    tone: "coral",
    size: "sm"
  }), " Jennifer Hristovski \xB7 sprayworksequipment.com"))));
}
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ctr cta__row"
  }, /*#__PURE__*/React.createElement("h2", null, "Ready to stop the marketing guesswork and ", /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "start growing?")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: Ico.arrow
  }, "Let's Talk Revenue")));
}
const LOCS = ["Cleveland", "Columbus", "Pittsburgh", "Indianapolis", "Chicago", "Nashville"];
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "ft"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ctr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ft__top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    className: "ft__logo",
    src: "../../assets/logo-knockout.png",
    alt: "Sixth City Marketing"
  }), /*#__PURE__*/React.createElement("p", null, "Expert-led SEO, PPC, and web design that helps businesses generate real revenue and ROI growth. Headquartered in Westlake, OH \u2014 serving businesses nationwide."), /*#__PURE__*/React.createElement("div", {
    className: "ft__locs"
  }, LOCS.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, "\xB7"), /*#__PURE__*/React.createElement("b", null, l.toUpperCase()))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Services"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "SEO & AI Search"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Pay-Per-Click"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Web Design"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Social Media"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Consulting")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Company"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Who We Are"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Our Team"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Case Studies"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Testimonials"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Careers")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Industries"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Manufacturing"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Higher Education"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Healthcare"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Legal"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Home Services"))), /*#__PURE__*/React.createElement("div", {
    className: "ft__bottom"
  }, "Sixth City Marketing \xA9 2010\u20132026 \xB7 Privacy Policy \xB7 All Rights Reserved")));
}
function App() {
  return /*#__PURE__*/React.createElement("div", {
    className: "scm-site"
  }, /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Services, null), /*#__PURE__*/React.createElement(Results, null), /*#__PURE__*/React.createElement(CTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
Promise.resolve(window.__scmReady).then(() => {
  const NS = window[window.__SCM_NS] || {};
  ({
    Button,
    Input,
    StatBlock,
    Avatar,
    Badge
  } = NS);
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/app.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.ScoreMeter = __ds_scope.ScoreMeter;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
