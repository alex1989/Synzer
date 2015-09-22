(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var MediatorMixin = require('./MediatorMixin');
var template = require('../tpl/controls.html');

function Controls(el) {
  this.el = el;
  MediatorMixin.call(this);

  this.el.innerHTML = template;
}

Controls.prototype.activate = function() {
  var this_ = this;
  this.el.addEventListener('change', function(e) {
    this_.emit(e.target.name + '-change', e.target.value);
  });

  // senging out initial values
  Array.prototype.forEach.call(this.el.querySelectorAll('[name]'), function(el) {
    if (el.type == 'radio' && el.checked === false) {
      return;
    }
    this_.emit(el.name + '-change', el.value);
  });
}

module.exports = Controls;
},{"../tpl/controls.html":11,"./MediatorMixin":3}],2:[function(require,module,exports){
var Note = require('./Note');
var MediatorMixin = require('./MediatorMixin');

function Keyboard(el) {
  this.el = el;
  this._keysPressed = {};
  MediatorMixin.call(this);
}

Keyboard.prototype.draw = function(lowestNote, highestNote) {
  var key;
  for(var i = lowestNote; i < highestNote; i++) {
    key = document.createElement('div');
    key.dataset.pitch = i;
    key.classList.add('key');
    if (['C#', 'D#', 'F#', 'G#', 'B'].indexOf(new Note(i).letter) > -1) {
      key.classList.add('key-black');
    }
    this.el.appendChild(key);
  }
};

Keyboard.prototype.startMouseListening = function() {
  var this_ = this;

  function pressed(el) {
    if (!el.classList.contains('key'))
      return;
    el.classList.add('pressed');
    this_.emit('notePressed', new Note(el.dataset.pitch));
  }

  function released(el) {
    if (!el.classList.contains('key'))
      return;
    el.classList.remove('pressed');
    this_.emit('noteReleased', new Note(el.dataset.pitch));
  }

  this.el.addEventListener('mousedown', function(e) {
    this_._mouseDown = true;
    pressed(e.target);
  });

  this.el.addEventListener('mouseover', function(e) {
    if (this_._mouseDown) {
      pressed(e.target);
    }
  });

  this.el.addEventListener('mouseleave', function(e) {
    this_._mouseDown = false;
  });

  this.el.addEventListener('mouseout', function(e) {
    if (this_._mouseDown) {
      released(e.target);
    }
  });

  this.el.addEventListener('mouseup', function(e) {
    if (this_._mouseDown) {
      released(e.target);
    }
    this_._mouseDown = false;
  });
};

Keyboard.prototype.on = function(eventName, callback) {
  this._events[eventName] = this._events[eventName] || [];
  this._events[eventName].push(callback);
};

Keyboard.prototype.emit = function(eventName) {
  var args = Array.prototype.slice.call(arguments, 1);

  this._events[eventName].forEach(function(callback) {
    callback.apply(null, args);
  });
};

module.exports = Keyboard;

},{"./MediatorMixin":3,"./Note":4}],3:[function(require,module,exports){
function MediatorMixin() {
  this._events = {};
  this.on = function(eventName, callback) {
    this._events[eventName] = this._events[eventName] || [];
    this._events[eventName].push(callback);
  };

  this.emit = function(eventName) {
    var args = Array.prototype.slice.call(arguments, 1);

    if (this._events[eventName]) {
      this._events[eventName].forEach(function(callback) {
        callback.apply(null, args);
      });
    }
  };
};

module.exports = MediatorMixin;
},{}],4:[function(require,module,exports){
function Note(letterWithOctaveOrPitch) {
  if (!this._parsePitch(letterWithOctaveOrPitch) && !this._parseLetter(letterWithOctaveOrPitch)) {
    throw new Error('Can not parse ' + letterWithOctaveOrPitch);
  }
}

Note.prototype._NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];

Note.prototype._parsePitch = function(pitch) {
  // 21 == A0
  pitch = parseInt(pitch);
  if (isNaN(pitch) || pitch < 21 || pitch > 108)
    return false;
  
  this.letter = this._NOTES[(pitch - 21 + 9) % 12];
  this.octave = Math.floor((pitch - 12) / 12);
  this.pitch = pitch;
  this.frequency = this._freq(this.pitch);
  return true;
};

Note.prototype._parseLetter = function(letterOctave) {
  var match = letterOctave.match(/([ABCDEFGH]#?)(\d+)/);
  if (!match.length)
    return false;
  this.letter = match[1];
  this.octave = parseInt(match[2]);
  this.pitch = this._NOTES.indexOf(this.letter) + 12 * (this.octave + 1);
  this.frequency = this._freq(this.pitch);
  return true;
};

Note.prototype._freq = function(pitch) {
  return Math.pow(2, (pitch - 20 - 49) / 12) * 440;
};

module.exports = Note;
},{}],5:[function(require,module,exports){
function SineModulator (options) {
  options = options || {};
  this._frequency = options.frequency || 0;
  this._xOffset = 0;
  this._startedAt = 0;
  this._interval = null;
  this._prevValue = 0;
  this.depth = options.depth || 0;

  Object.defineProperty(this, "frequency", { 
    set: function (frequency) {
      // the offset is needed in order to have seamless
      // transition between different frequencies
      this._xOffset = this._nowToX();
      this._frequency = frequency;
    },
    get: function() {
      return this._frequency;
    }
  });
}

SineModulator.prototype._nowToX = function(time) {
  return (Date.now() - this._startedAt) / 1000 * this.frequency * 2 * Math.PI
};

SineModulator.prototype.modulate = function(object, property) {
  this._objToModulate = object;
  this._propertyToModulate = property;
};

SineModulator.prototype.start = function() {
  this._startedAt = Date.now();
  var this_ = this;
  this._interval = setInterval(function() {
    var value = this_._modValueNow();
    var diff = value - this_._prevValue;
    this_._objToModulate[this_._propertyToModulate] += diff;
    this_._prevValue = value;
  }, 25);
};

SineModulator.prototype._modValueNow = function(time) {
  // 1 dB = 125,89%
  return Math.sin(this._nowToX() - this._xOffset) * this.depth;
};

SineModulator.prototype.stop = function() {
  clearInterval(this._interval);
}

module.exports = SineModulator;

},{}],6:[function(require,module,exports){
var PitchShifter = require('./synthMixins/PitchShifter')
var ADSR = require('./synthMixins/ADSR')

function Synth(context) {
  this._oscillators = {};
  this._context = context;
  this._notes = {};
  this._output = context.createGain();
}

Synth.prototype.play = function(note) {
  var oscillator;

  if (!this._oscillators[note.pitch]) {
    oscillator = this._oscillators[note.pitch] = this._context.createOscillator()
  }

  oscillator.frequency.value = note.frequency;
  oscillator.connect(this._output);
  oscillator.start(0);
  return oscillator;
};

Synth.prototype.stop = function(note) {
  this._oscillators[note.pitch].stop(0);
};

Synth.prototype.connect = function(output) {
  this._output.connect(output);
};

module.exports = Synth;
},{"./synthMixins/ADSR":9,"./synthMixins/PitchShifter":10}],7:[function(require,module,exports){
(function (global){
var Keyboard = require('./Keyboard');
var Controls = require('./Controls');
var Synth = require('./Synth');
var Delay = require('./effects/Delay');
var SineModulator = require('./SineModulator');

var audioCtx = new global.AudioContext();
var synth = new Synth(audioCtx);
var volume = audioCtx.createGain();
var pan = audioCtx.createStereoPanner();
var delay = new Delay(audioCtx);

synth.connect(volume);
volume.connect(delay.input);
delay.connect(pan);
pan.connect(audioCtx.destination);

var tremolo = new SineModulator();
tremolo.modulate(volume.gain, 'value');

var vibrato = new SineModulator();
vibrato.modulate(synth, 'pitchShift');

var controls = new Controls(document.querySelector('.controls'));

controls.on('wave-form-change', function(type) {
  synth.waveForm = type;
});

controls.on('volume-change', function(value) {
  volume.gain.value = value;
});

controls.on('pan-change', function(value) {
  pan.pan.value = value;
});

controls.on('tremolo-on-change', function(value) {
  parseInt(value) ? tremolo.start() : tremolo.stop();
});

controls.on('tremolo-depth-change', function(value) {
  tremolo.depth = value;
});

controls.on('tremolo-freq-change', function(value) {
  tremolo.frequency = value;
});

controls.on('vibrato-on-change', function(value) {
  parseInt(value) ? vibrato.start() : vibrato.stop();
});

controls.on('vibrato-depth-change', function(value) {
  vibrato.depth = value;
});

controls.on('vibrato-freq-change', function(value) {
  vibrato.frequency = value;
});

controls.on('delay-on-change', function(value) {
  parseInt(value) ? delay.start() : delay.stop();
});

controls.on('delay-feedback-change', function(value) {
  delay.feedback = value;
});

controls.on('delay-taps-change', function(value) {
  delay.taps = value;
});

controls.on('delay-latency-change', function(value) {
  delay.latency = value;
});

controls.activate();

var keyboard = new Keyboard(document.querySelector('.keyboard'));
keyboard.draw(60, 84);
keyboard.startMouseListening();

keyboard.on('notePressed', function(note) {
  synth.play(note);
});

keyboard.on('noteReleased', function(note) {
  synth.stop(note);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Controls":1,"./Keyboard":2,"./SineModulator":5,"./Synth":6,"./effects/Delay":8}],8:[function(require,module,exports){
function Delay(audioCtx) {
  this._audioCtx = audioCtx;
  this.input = audioCtx.createGain();
  this._delayLines = [];
  this._gainNodes = [];
  this._delayLinesInput = audioCtx.createGain();
  this._output = audioCtx.createGain();

  this._taps = 0;
  this._latency = 0;
  this._feedback = 0;

  Object.defineProperty(this, "feedback", { 
    set: function (freq) {
      this._feedback = freq;
      this._applyParams();
    },
    get: function() {
      return this._latency;
    }
  });

  Object.defineProperty(this, "latency", { 
    set: function (freq) {
      this._latency = freq;
      this._applyParams();
    },
    get: function() {
      return this._latency;
    }
  });

  Object.defineProperty(this, "taps", { 
    set: function (value) {
      var prevTaps = this._taps;
      var diff = value - this._taps;
      for(var i = 0; i < diff; i++) {
        diff < 0 ? this._popTap() : this._pushTap();
      }
      this._taps = value;
    },
    get: function() {
      return this._taps;
    }
  });

  this.input.connect(this._output);
}

Delay.prototype._applyParams = function() {
  for(var i = 0; i < this._delayLines.length; i++) {
    this._delayLines[i].delayTime.value = this._latency / 1000 * (i + 1);
    this._gainNodes[i].gain.value = Math.pow(this._feedback, (1 + i))
  }
};

Delay.prototype._pushTap = function() {
  var delay = this._audioCtx.createDelay(10.0);
  this._delayLines.push(delay);
  
  var gainNode = this._audioCtx.createGain();
  this._gainNodes.push(gainNode);
  
  gainNode.connect(this._output);
  delay.connect(gainNode);
  this._delayLinesInput.connect(delay);
};

Delay.prototype._popTap = function() {
  var lastDelayLine = this._delayLines.pop();
  var lastGainNode = this._gainNodes.pop();

  lastDelayLine.disconnect(lastGainNode);
  lastGainNode.disconnect(this._output);
  this._delayLinesInput.disconnect(lastDelayLine);
};

Delay.prototype.start = function() {
  if (!this._started) {
    this.input.connect(this._delayLinesInput);
    this._started = true;
  }
}

Delay.prototype.stop = function() {
  if (this._started) {
    this.input.disconnect(this._delayLinesInput);
    this._started = false;
  }
};

Delay.prototype.connect = function(target) {
  this._output.connect(target);
};

module.exports = Delay;

},{}],9:[function(require,module,exports){
function ADSR() {
  // S_duration and R_dy are always the rest
  this.ADSR = {
    A_duration: null,
    D_duration: null,
    R_duration: null,
    A_dy: null,
    D_dy: null,
    S_dy: null
  };
}

module.exports = ADSR;
},{}],10:[function(require,module,exports){
function PitchShifter() {
  this.pitchShift = 0;

  Object.defineProperty(this, "pitchShift", { 
    set: function (ps) {
      this._pitchShift = ps;
      for(var pitch in this._oscillators) {
        this._oscillators[pitch].frequency.value =
          this._oscillators[pitch].baseFrequency * Math.pow(2, this._pitchShift/1200);
      }
    },
    get: function() {
      return this._pitchShift;
    }
  });

  Math.pow(2, this._pitchShift/1200)
}

module.exports = PitchShifter;
},{}],11:[function(require,module,exports){
module.exports = "<link rel=\"stylesheet\" href=\"css/controls.css\">\n\n<div class=\"col1-container\">\n  <h3>Tremolo</h3>\n  <label>\n    <input type=\"radio\" name=\"tremolo-on\" value=\"1\"><span>ON</span>\n  </label>\n  <label>\n    <input type=\"radio\" type=\"radio\" name=\"tremolo-on\" value=\"0\" checked=\"true\"><span>OFF</span>\n  </label>\n  <label class=\"osc1-depth\">\n    <span>Depth</span>\n    <input type=\"number\" name=\"tremolo-depth\" value=\"0.2\" step=\"0.1\" max=\"1000\" min=\"0\">\n  </label>\n  <label class=\"osc1-length\">\n    <span>Freq</span>\n    <input type=\"number\" name=\"tremolo-freq\" value=\"2\">\n  </label>\n</div>\n\n<div class=\"col1-container\">\n  <h3>Vibrato</h3>\n  <label>\n    <input type=\"radio\" name=\"vibrato-on\" value=\"1\"><span>ON</span>\n  </label>\n  <label>\n    <input type=\"radio\" type=\"radio\" name=\"vibrato-on\" value=\"0\" checked=\"true\"><span>OFF</span>\n  </label>\n  <label class=\"osc1-length\">\n    <span>Cent</span>\n    <input type=\"number\" name=\"vibrato-depth\" min=\"\" step=\"10\" max=\"200\" value=\"50\">\n  </label>\n  <label class=\"osc1-depth\">\n    <span>Freq</span>\n    <input type=\"number\" name=\"vibrato-freq\" value=\"5\" max=\"20\" min=\"0\">\n  </label>\n</div>\n\n<div class=\"col1-container\">\n  <h3>Delay</h3>\n  <label>\n    <input type=\"radio\" name=\"delay-on\" value=\"1\"><span>ON</span>\n  </label>\n  <label>\n    <input type=\"radio\" type=\"radio\" name=\"delay-on\" value=\"0\" checked=\"true\"><span>OFF</span>\n  </label>\n  <label class=\"delay-taps\">\n    <span>Taps</span>\n    <input type=\"number\" name=\"delay-taps\" value=\"2\" max=\"10\" min=\"0\">\n  </label>\n  <label class=\"delay-feedback\">\n    <span>Feedback</span>\n    <input type=\"number\" name=\"delay-feedback\" value=\"0.7\" max=\"2\" min=\"0\" step=\"0.1\">\n  </label>\n  <label class=\"delay-freq\">\n    <span>Latency</span>\n    <input type=\"number\" name=\"delay-latency\" value=\"400\" step=\"10\" min=\"0\" max=\"5000\">\n  </label>\n</div>\n\n<div class=\"col1-container\">\n  <h3>ADSR</h3>\n</div>\n\n<div class=\"volume-pan-container col1-container\">\n  <label class=\"volume\">\n    <span>Volume</span>\n    <input class=\"volume\" name=\"volume\" value=\"0.5\" min=\"0\" max=\"1\" step=\"0.1\" type=\"number\">\n  </label>\n  <label class=\"pan\">\n    <span>Pan</span>\n    <input class=\"volume\" name=\"pan\" value=\"0\" min=\"-1\" max=\"1\" step=\"0.1\" type=\"number\">\n  </label>\n</div>\n\n<div class=\"wave-form-container col2-container\">\n  <label class=\"wave-form sine\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"sine\" checked>\n  </label>\n  <label class=\"wave-form sawtooth\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"sawtooth\">\n  </label>\n  <label class=\"wave-form square\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"square\">\n  </label>\n</div>\n";

},{}]},{},[7]);
