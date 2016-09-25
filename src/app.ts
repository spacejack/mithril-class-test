declare const m: Mithril.Static

import LongPresser from './longpresser'

let wasPressed = false
let numExtras = 0

export default {
	view (vnode: Mithril.Vnode) {
		return m('div', [
			m('div', {class: 'pressme'},
				m(LongPresser, {
					text: "Press Me",
					textColor: '#FFF',
					fgStrokeColor: '#F00',
					bgStrokeColor: '#A00',
					bgFillColor: '#800',
					duration: 0.75,
					onpressed: () => {wasPressed = true}
				})
			),
			m('span', {style: {marginLeft: '2em'}}, wasPressed ? 'Pressed!' : ''),
			m('p',
				m('button', {onclick: () => {++numExtras}}, "Create another")
			),
			// Add any extra longpressers that were created by user
			m('p',
				(function(){
					const extras: Mithril.Vnode[] = []
					for (let i = 0; i < numExtras; ++i) {
						extras.push(
							m('div', {class: 'pressme', style: {width: '100px', height: '100px'}},
								m(LongPresser, {
									text: "Press me "+(i+1),
									textColor: '#333',
									fgStrokeColor: '#666',
									bgStrokeColor: '#888',
									bgFillColor: '#EEE',
									duration: 0.75
								})
							)
						)
					}
					return extras
				}())
			)
		])
	}
}
