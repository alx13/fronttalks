'use strict';
/* global Hypher, $ */
/* global Typeset */

/* Warning! Быдлокод */
var measure,
    format,
    h = new Hypher(Hypher.ru),
    ruler = $('<span> </span>').css({
        visibility: 'hidden',
        position: 'absolute',
        top: '0cm', // '-9000px',
        width: 'auto',
        display: 'inline',
        left: '-9000cm' // '-9000px'
    }),
    hyphenPenalty = 100,
    pxInEm,
    pxInCm,
    prepareNodes,
    hyphenateToNodes,
    space,
    paraIndent;

prepareNodes = function(text) {
    var i,
    tempWord = '',
    nodes = [];
    for (i=0; i<text.length; i+=1) {
        if (text[i] === ' ') {
            if (tempWord) {
                nodes = nodes.concat(hyphenateToNodes(tempWord));
            }
            tempWord = '';
            nodes.push(Typeset.linebreak.penalty(0, Typeset.linebreak.infinity, 0));
            nodes.push(Typeset.linebreak.glue(space.width, space.stretch, space.shrink));
        } else if (text[i] === ' ') {
            if (tempWord) {
                nodes = nodes.concat(hyphenateToNodes(tempWord));
            }
            tempWord = '';
            nodes.push(Typeset.linebreak.glue(space.width, space.stretch, space.shrink));
        } else if (text[i] === '-') {
            if (tempWord) {
                nodes = nodes.concat(hyphenateToNodes(tempWord));
            }
            tempWord = '';
            nodes.push(Typeset.linebreak.box(measure('-'),'-'));
            nodes.push(Typeset.linebreak.penalty(0, hyphenPenalty/4, 1));
        } else if (/^[,.:;|!?]$/.test(text[i])) {
            if (tempWord) {
                nodes = nodes.concat(hyphenateToNodes(tempWord));
            }
            tempWord = '';
            nodes.push(Typeset.linebreak.box(measure(text[i]),text[i]));
        } else if (i === 0 && text[i] === '—' && /\s/.test(text[i+1])) {
            nodes.push(Typeset.linebreak.box(measure('—'),'—'));
            nodes.push(Typeset.linebreak.box(space.width,'¥'));
            i+=1;
        } else {
            tempWord += text[i];
        }
    }
    if (tempWord) {
        nodes = nodes.concat(hyphenateToNodes(tempWord, true));
    }
    return nodes;
};

hyphenateToNodes = function (word) {
    var nodes = [],
        hyphenated,
        thisHyphenPenalty;
    if (word.length > 6) {
        hyphenated = h.hyphenate(word, 'ru');
        if (hyphenated.length > 1) {
            hyphenated.forEach(function(syll,syllIndex){
                nodes.push(Typeset.linebreak.box(measure(syll),syll));
                thisHyphenPenalty = (hyphenPenalty*hyphenated.length-syllIndex*hyphenPenalty) > hyphenPenalty ? hyphenPenalty*hyphenated.length-syllIndex*hyphenPenalty : hyphenPenalty;
                nodes.push(Typeset.linebreak.penalty(measure('-'), thisHyphenPenalty, 1, true));
            });
            nodes.pop();
        } else {
            nodes.push(Typeset.linebreak.box(measure(word),word));
        }
    } else {
        nodes.push(Typeset.linebreak.box(measure(word),word));
    }
    return nodes;
};
    


measure = function measure(string) {
    var measureCache = {};
    if (measureCache[string] === undefined) {
        $(ruler).html(string);
        measureCache[string]=parseFloat($(ruler).width()/100);
    }
    return measureCache[string];
};

format = function format(para, align) {
    var nodes = [],
        breaks = [];
    ruler.css('font-size', parseFloat($(para).css('font-size'))*100);
    ruler.css('font-family', $(para).css('font-family'));
    $(ruler).css('width', parseFloat($(para).css('font-size'))*100);
    pxInEm = measure('');
    $(ruler).css('width', 'auto');
    space = {
        width: pxInEm/3,
        stretch: pxInEm * (5/12),
        shrink: pxInEm * (1/12)
    };
    paraIndent = Math.round(parseFloat($(para).css('text-indent')));
    nodes.push(Typeset.linebreak.box(paraIndent));
    nodes.push(Typeset.linebreak.penalty(0,Typeset.linebreak.infinity,0));

    nodes = nodes.concat(prepareNodes($(para).text()));

    nodes.push(Typeset.linebreak.penalty(0, Typeset.linebreak.infinity, 0));
    nodes.push(Typeset.linebreak.glue(0, Typeset.linebreak.infinity, 0));
    nodes.push(Typeset.linebreak.penalty(0, -Typeset.linebreak.infinity, 0));
    if (align === 'sand-clock') {
        var triangleArray = [];
        for (var k = 0; k < 18; k+=1) {
            triangleArray.push(400-k*12);
        }
        for (k = 0; k < 80; k+=1) {
            triangleArray.push(k*12+188);
        }
        breaks = Typeset.linebreak(nodes, triangleArray, {tolerance: 800});
    }
    else {
        breaks = Typeset.linebreak(nodes, [$(para).width()], {tolerance: 1});
        if (breaks.length === 0) {
            breaks = Typeset.linebreak(nodes, [$(para).width()], {tolerance: 2});
            if (breaks.length === 0) {
                breaks = Typeset.linebreak(nodes, [$(para).width()], {tolerance: 5});
                if (breaks.length === 0) {
                    breaks = Typeset.linebreak(nodes, [$(para).width()], {tolerance: 20});
                }
            }
        }
    }
    var i,
        r,
        lines = [],
        point,
        lineStart;
    for (i = 1; i < breaks.length; i += 1) {
        point = breaks[i].position;
        r = breaks[i].ratio;
        for (var j = lineStart; j < nodes.length; j += 1) {
            if (nodes[j].type === 'box' || (nodes[j].type === 'penalty' && nodes[j].penalty === -Typeset.linebreak.infinity)) {
                lineStart = j;
                break;
            }
        }
        lines.push({ratio: r, nodes: nodes.slice(lineStart, point + 1), position: point});
        lineStart = point;
    }
    var newHTML = '';
    lines.forEach(function (line, lineIndex, lineArray) {
        var node,
            tmp = [],
            j,
            spaceCount = 0,
            preSpaceSize = line.ratio * (line.ratio < 0 ? space.shrink : space.stretch)+ space.width,
            flooredSpaceSize = Math.floor(preSpaceSize),
            expandedSpaceCount,
            spaceSize;
        for (j=0; j<line.nodes.length-1; j+=1) {
            node = line.nodes[j];
            if (node.type === 'glue') {
                spaceCount+=1;
            }
        }
        expandedSpaceCount = (Math.floor(preSpaceSize*spaceCount)-Math.floor(preSpaceSize)*spaceCount);
        // console.log('totalSpaceSize: ' + preSpaceSize*spaceCount);
        // console.log('flooredSpaceSize: ' + Math.floor(preSpaceSize));
        // console.log('adjustedTotalSpaceSize: ' + (expandedSpaceCount*(flooredSpaceSize+1) + (spaceCount-expandedSpaceCount)*flooredSpaceSize));
        // console.log('expandedSpaceCount: ' + expandedSpaceCount);
        // console.log('preSpaceSize: ' + preSpaceSize);
        // console.log('spaceCount: ' + expandedSpaceCount);

        for (j=0; j<line.nodes.length; j+=1) {
            node = line.nodes[j];
            if (node.type === 'box' && node.value === '¥') {
                tmp.push('<span style="display:inline-block;width:'+space.width+'px"></span>');
            } else if (node.type === 'box' && node.value === undefined) {
                tmp.push('<span style="display:inline-block;width:'+paraIndent+'px"></span>');
            } else if (node.type === 'box' && node.value) {
                tmp.push(node.value);
            } else if (node.type === 'glue' && j !== line.nodes.length-1) {
                if (align === 'left' && line.ratio >= 0) {
                    tmp.push('<span style="display: inline-block; width:'+space.width+'px;"></span>');
                } else {
                    if (expandedSpaceCount > 0) {
                        spaceSize = flooredSpaceSize + 1;
                        expandedSpaceCount-=1;
                    } else {
                        spaceSize = flooredSpaceSize;
                    }
                    tmp.push('<span style="display: inline-block; width:'+spaceSize+'px;"></span>');
                }
            } else if (node.type === 'penalty' &&
                       node.hyphen &&
                       j === line.nodes.length-1 &&
                       line.nodes[j-1].value[line.nodes[j-1].value.length-1] !== '-') {
                tmp.push('-');
            } else if (node.type === 'penalty' && j === line.nodes.length-1 && lineIndex === lineArray.length-1) {
                tmp.pop();
            }
        }

        if (align === 'sand-clock') {
            var leftOffset = ($(para).width()-triangleArray[lineIndex])/2;
            newHTML+='<span class="line" style="width:'+triangleArray[lineIndex]+'px;left:'+leftOffset+'px;">'+tmp.join('')+'<span style="left:'+($(para).width()-leftOffset+10)+'px;" class="aside">'+(line.ratio).toFixed(4)+'</span></span>';
        } else {
            newHTML+='<span class="line">'+tmp.join('')+'<span class="aside">'+(line.ratio).toFixed(4)+'</span></span>';
        }

    });
    $(para).html(newHTML);
    $(para).css('text-indent','0');
};

$('body').append(ruler);

$(ruler).css('width', '100cm');
pxInCm = measure('');
$(ruler).css('width', 'auto');


$('.knuth-plass').children('p').each(function(index, para) {
    format(para);
});
$('.knuth-plass-left').children('p').each(function(index, para) {
    format(para, 'left');
});
$('.knuth-plass-triangle').children('p').each(function(index, para) {
    format(para, 'sand-clock');
});
