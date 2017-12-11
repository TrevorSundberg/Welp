
define("ace/mode/grammar", ["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/text_highlight_rules"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
var TextMode = require("./text").Mode;

var GrammarRules = function() {
    var builtinConstants = (
        "e"
    );
    var keywordMapper = this.createKeywordMapper({
        "constant.language": builtinConstants
    }, "identifier", true);

    this.$rules = {
        "start" : [ {
            token : "comment",
            regex : "//.*$"
        }, {
            token : "string",           // " string
            regex : '".*?"'
        }, {
            token : "string",           // ' string
            regex : "'.*?'"
        }, {
            token : "constant.numeric", // float
            regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
        }, {
            token : keywordMapper,
            regex : "[a-zA-Z_][a-zA-Z)0-9]*\\b"
        }, {
            token : "keyword.operator",
            regex : "[=+*?|]"
        }, {
            token : "paren.lparen",
            regex : "\\(\\["
        }, {
            token : "paren.rparen",
            regex : "\\)\\]"
        }, {
            token : "text",
            regex : "\\s+"
        } ]
    };
};

oop.inherits(GrammarRules, TextHighlightRules);

//exports.GrammarRules = GrammarRules;


var Mode = function() {
    this.HighlightRules = GrammarRules;
};
oop.inherits(Mode, TextMode);

(function() {
    this.type = "text";

    this.$id = "ace/mode/rst";
}).call(Mode.prototype);

exports.Mode = Mode;
});