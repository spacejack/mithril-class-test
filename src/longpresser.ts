declare const m: Mithril.Static

const DEFAULT_DURATION = 1 * 1000
const RADIUS = 50
const STROKE_WIDTH = 8
const F_STROKE_WIDTH = 1

// in the absense of Pointer events support...
const DEVICE_NONE = 0
const DEVICE_MOUSE = 1
const DEVICE_TOUCH = 2

let device = DEVICE_NONE

interface Vec2 {
	x: number
	y: number
}

//
// LongPresser component
//
class LongPresser extends m.Component {
	el: HTMLElement
	elSvg: SVGSVGElement
	elBgCircle: SVGCircleElement
	elFgCircle: SVGCircleElement
	elArc: SVGSVGElement
	elText: SVGTextElement
	elFgText: SVGTextElement
	duration: number
	fgStrokeColor: string
	bgStrokeColor: string
	isPressed: boolean
	isFinished: boolean
	pressT: number
	prevT: number

	constructor ({attrs}: Mithril.Vnode) {
		super()
		// Set up state vars
		this.duration = (+attrs.duration > 0) ? (+attrs.duration) * 1000 : DEFAULT_DURATION
		this.fgStrokeColor = attrs.fgStrokeColor
		this.bgStrokeColor = attrs.bgStrokeColor
		this.isPressed = false
		this.pressT = 0
		this.isFinished = false
		this.prevT = Date.now()
	}

	oncreate ({dom}: Mithril.Vnode) {
		// Grab some elements we'll use a lot
		this.el = dom as HTMLElement
		this.elSvg = this.el.childNodes[0] as SVGSVGElement
		this.elBgCircle = this.elSvg.childNodes[0] as SVGCircleElement
		this.elArc = this.elSvg.childNodes[1] as SVGSVGElement
		this.elText = this.elSvg.childNodes[2] as SVGTextElement
		this.elFgCircle = this.elSvg.childNodes[3] as SVGCircleElement
		this.elFgText = this.elSvg.childNodes[4] as SVGTextElement

		// Add our own event listeners hidden from Mithril
		this.el.addEventListener('mousedown', () => {
			if (device !== DEVICE_TOUCH) {
				device = DEVICE_MOUSE
				if (!this.isPressed) {
					this.startPress()
				}
			}
		})
		this.el.addEventListener('mouseup', () => {
			if (device !== DEVICE_TOUCH) {
				device = DEVICE_MOUSE
				if (this.isPressed) {
					this.endPress()
				}
			}
		})
		this.el.addEventListener('touchstart', () => {
			if (device !== DEVICE_MOUSE) {
				device = DEVICE_TOUCH
				if (!this.isPressed) {
					this.startPress()
				}
			}
		})
		this.el.addEventListener('touchend', () => {
			if (device !== DEVICE_MOUSE) {
				device = DEVICE_TOUCH
				if (this.isPressed) {
					this.endPress()
				}
			}
		})
	}

	view ({attrs}: Mithril.Vnode) {
		console.log('LongPresser view called')
		return m('div', {class: 'longpresser', style: {cursor: this.isFinished ? 'default' : 'pointer'}, onpressed: attrs.onpressed},
			m('svg', {viewBox: `0 0 ${RADIUS*2} ${RADIUS*2}`, version: '1.1', xmlns: 'http://www.w3.org/2000/svg'},
				m('circle', {cx: RADIUS, cy: RADIUS, r: RADIUS-STROKE_WIDTH/2, style: {fill: attrs.bgFillColor, stroke: this.isFinished ? attrs.fgStrokeColor : attrs.bgStrokeColor, strokeWidth: STROKE_WIDTH}}),
				m('path', {d: svgArcPath(RADIUS, RADIUS, RADIUS-STROKE_WIDTH/2, 0, 360.0 * accel(this.pressT / this.duration)), style: {fill: 'transparent', stroke: attrs.fgStrokeColor, strokeWidth: STROKE_WIDTH}}),
				m('text', {x: RADIUS, y: RADIUS, style: {textAnchor: 'middle', dominantBaseline: 'middle', fontSize: '0.95em', fill: attrs.textColor}}, attrs.text),
				m('circle', {cx: RADIUS, cy: RADIUS, r: RADIUS-F_STROKE_WIDTH/2, style: {fill: '#EEE', stroke: '#CCC', strokeWidth: F_STROKE_WIDTH, opacity: this.isFinished ? 1 : 0}}),
				m('text', {x: RADIUS, y: RADIUS, style: {textAnchor: 'middle', dominantBaseline: 'middle', fontSize: '1.5em', fill: '#000', opacity: this.isFinished ? 1 : 0}}, m.trust('&#10004'))
			)
		)
	}

	// Internally used methods

	protected startPress() {
		this.isPressed = true
		this.prevT = Date.now()
		requestAnimationFrame(() => {this.updatePress()})
	}

	protected endPress() {
		this.isPressed = false
	}

	protected updatePress() {
		if (!this.isPressed) {
			this.updateRelease()
			return
		}
		const t = Date.now()
		const dt = t - this.prevT
		this.pressT = Math.min(this.pressT + dt, this.duration)
		drawArc(this.elArc, accel(this.pressT / this.duration))
		this.prevT = t
		if (this.pressT >= this.duration) {
			this.finish()
			return // cancel the animation loop by exiting here
		}
		// Keep animation running
		requestAnimationFrame(() => {this.updatePress()})
	}

	protected updateRelease() {
		const t = Date.now()
		const dt = t - this.prevT
		this.pressT = Math.max(this.pressT - dt, 0)
		drawArc(this.elArc, accel(this.pressT / this.duration))
		this.prevT = t
		if (this.pressT <= 0) {
			return // cancel the animation loop by exiting here
		}
		// Keep animation running
		// Use updatPress in case isPressed state changes
		requestAnimationFrame(() => {this.updatePress()})
	}

	protected finish() {
		drawArc(this.elArc, 0)
		this.el.style.cursor = 'default'
		this.elBgCircle.style.stroke = this.fgStrokeColor
		this.pressT = 0
		this.isPressed = false
		this.isFinished = true
		fadeIn(this.elFgCircle)
		fadeIn(this.elFgText)
		this.el.dispatchEvent(new Event('pressed'))
	}

	protected reset() {
		this.isPressed = false
		this.pressT = 0
		this.elBgCircle.style.stroke = this.bgStrokeColor
		this.el.style.cursor = 'pointer'
		drawArc(this.elArc, 0)
		this.isFinished = false
		// Hide the 'finished' elements
		removeFadeIn(this.elFgCircle)
		removeFadeIn(this.elFgText)
	}
}


// SVG Arc helper functions (because arcs are otherwise difficult with SVG!)

function polarToCartesian (centerX: number, centerY: number, radius: number, degrees: number, out: Vec2) {
	const r = (degrees-90) * Math.PI / 180.0
	out.x = centerX + (radius * Math.cos(r))
	out.y = centerY + (radius * Math.sin(r))
	return out
}

// Create an SVG arc definition centred at x,y with radius,
// start and end angles (clockwise, in degrees)
const svgArcPath = (function(){
	const _p0 = {x: 0, y: 0}
	const _p1 = {x: 0, y: 0}
	function svgArcPath (x: number, y: number, radius: number, startAngle: number, endAngle: number) {
		polarToCartesian(x, y, radius, endAngle, _p0)
		polarToCartesian(x, y, radius, startAngle, _p1)
		const arcSweep = endAngle - startAngle <= 180 ? '0' : '1'
		return 'M ' + _p0.x + ' ' + _p0.y +
			'A ' + radius + ' ' + radius + ' 0 ' + arcSweep + ' 0 ' + _p1.x + ' ' + _p1.y
	}
	return svgArcPath
}())

/**
 * Draw % of arc
 * @param {HTMLElement} el
 * @param {number} pct
 */
function drawArc (el: SVGSVGElement, pct: number) {
	el.setAttribute('d',
		svgArcPath(
			RADIUS, RADIUS, RADIUS - STROKE_WIDTH / 2, 0, pct * 360
		)
	)
}

/** Non-linear arc motion */
function accel (t: number) {
	return Math.pow(t, 2.25)
}

function fadeIn (el: any) {
	el.style.opacity = '1'
	el.classList.add('longpresser-fade-in')
}

function removeFadeIn (el: any) {
	el.style.opacity = '0'
	el.classList.remove('longpresser-fade-in')
}

// Must do some funky casting to make a compatible type :(
export default <any>LongPresser as typeof Mithril.Component
