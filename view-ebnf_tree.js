/************************************************************************************************/
welp.addView('ebnf_tree', 'EBNF Tree', [welp.views.grammar], function(container, state)
{
  var grammar = welp.views.grammar;
  
  var pseudoCode =
    "Rules = (Rule ';')+;\n" +
    "Rule = Identifier Equals Expression0;\n" +
    "Expression0 = Expression1 (Or Expression1)*;\n" +
    "Expression1 = Expression2 Expression2*;\n" +
    "Expression2 = Expression3 [*+?]*;\n" +
    "Expression3 = Identifier | String | Any | Range | '(' Expression0 ')';";
  
  var slider = welp.createSlider(container);
  
  var graph = welp.createGraph(container, 'hierarchical');
  
  var pseudoEditor = welp.createPseudoCode(container, pseudoCode, "ace/mode/grammar");
  
  var algorithm = function(maxSteps)
  {
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet();
    
    var result =
    {
      steps: 0,
      output: null,
      postRun: []
    };
    
    result.postRun.push(function()
    {
      grammar.session.clearAnnotations();
      grammar.editor.clearHighlights();
      pseudoEditor.clearHighlights();
      welp.updateGraph(graph, nodes, edges);
    });
    
    // We always take an implicit step at the beginning to have an empty state
    if (result.steps++ >= maxSteps)
      return result;
    
    var index = 0;
    var line = 0;
    var character = 0;
    var lastNodeStart = 0;
    var text = grammar.text;
    var lastAccepted = '';
    var parentRule = '';
    var idCounter = { };
    
    var grammarStartIndex = undefined;
    var grammarEndIndex = undefined;
    var pseudoStartLine = undefined;
    var pseudoEndLine = undefined;
    
    var eatWhitespace = function()
    {
      // Eat whitespace
      while (/\s/.test(text[index]))
      {
        ++character;
        if (text[index] == '\n')
        {
          ++line;
          character = 0;
        }
        ++index;
      }
    }
    
    var accept = function(c)
    {
      eatWhitespace();
      var next = text[index];
      if (next === undefined)
        return false;
      
      if (c instanceof RegExp && c.test(next) || next == c)
      {
        lastAccepted = next;
        ++index;
        eatWhitespace();
        return true;
      }
      
      eatWhitespace();
      return false;
    };
    
    var expect = function(expression, error)
    {
      if (typeof(expression) == "string" || expression instanceof RegExp)
      {
        if (error === undefined)
          error = "Expected '" + expression + "'";
        return expect(accept(expression), error);
      }
      else
      {
        if (expression === false || expression === undefined)
        {
          if (error === undefined)
            error = "Syntax error";
          throw error;
        }
      }
      
      return expression;
    };
    
    var createNode = function(type, content, label, children)
    {
      var id = parentRule + '/' + type + '/' + content + '/' + label + '/';
      
      if (idCounter[id] === undefined)
        idCounter[id] = 0;
      
      id += idCounter[id]++;
      
      nodes.add({ id: id, label: label });
      
      var node =
      {
        type: type,
        content: content,
        label: label,
        id: id,
        start: lastNodeStart,
        end: index,
        parent: null,
        children: [],
        add: function(child)
        {
          if (!child)
            return null;
          
          this.children.push(child);
          child.parent = this;
          var edge = this.id + " -> " + child.id;
          edges.update({ id: edge, from: this.id, to: child.id });
          return child;
        }
      };
      
      lastNodeStart = index;
      
      if (children)
      {
        if (children instanceof Array)
        {
          for (var i = 0; i < children.length; ++i)
            node.add(children[i]);
        }
        else
        {
          node.add(children);
        }
      }
      
      return node;
    };
    
    var Call = function(line, func)
    {
      if (result.steps++ >= maxSteps)
      {
        pseudoStartLine = line;
        pseudoEndLine = line;
        throw false;
      }
      
      var start = index;
      var ret = func();
      
      if (result.steps++ >= maxSteps)
      {
        grammarStartIndex = start;
        grammarEndIndex = index;
        
        pseudoStartLine = line;
        pseudoEndLine = line;
        throw false;
      }
      
      return ret;
    };
    
    // Rules = (Rule ';')*
    var Rules = function()
    {
      var node = createNode('Rules', '', 'Rules');
      node.parent = true;
      
      while (node.add(Call(1, Rule)) && expect(';'));
      
      // Eat whitespace
      while (/\s/.test(text[index]))
        ++index;
      
      if (index != text.length)
        throw 'More input leftover at the end of the stream: ' + text.slice(index);
      
      return node;
    };
    
    // Rule = Identifier '=' Expression0
    var Rule = function()
    {
      var name = Identifier();
      if (!name)
        return;
      
      parentRule = name;
      var node = createNode('Rule', name, name);
      
      expect('=');
      
      node.add(expect(Call(2, Expression0), 'Expected an expression on the right hand side of the "="'));
      return node;
    };
    
    // Expression0 = Expression1 (Or Expression1)*
    var Expression0 = function()
    {
      var node = Call(3, Expression1);
      if (!node)
        return;
      
      var or = null;
      
      while (accept('|'))
      {
        if (or == null)
          or = node = createNode('Union', '', '|', node);
        
        or.add(expect(Call(3, Expression1), 'Expected an expression on the right hand side of the "|"'));
      }
      
      return node;
    };
    
    // Expression1 = Expression2 Expression2*
    var Expression1 = function()
    {
      var node = Call(4, Expression2);
      if (!node)
        return;
      
      var join = null;
      var next = null;
      
      while (next = Call(4, Expression2))
      {
        if (join == null)
          join = node = createNode('Concatenate', '', '&', node);
        
        join.add(next);
      }
      
      return node;
    };
    
    // Expression2 = Expression3 [*+?]*
    var Expression2 = function()
    {
      var node = Call(5, Expression3);
      if (!node)
        return;
      
      while (accept('*') || accept('+') || accept('?'))
      {
        if (lastAccepted == '*')
          node = createNode('ZeroOrMore', '', lastAccepted, node);
        else if (lastAccepted == '+')
          node = createNode('OneOrMore', '', lastAccepted, node);
        else if (lastAccepted == '?')
          node = createNode('Optional', '', lastAccepted, node);
      }
      
      return node;
    };
    
    // Expression3 = Identifier | String | '.' | Range | '(' Expression0 ')'
    var Expression3 = function()
    {
      var name = Identifier();
      if (name)
      {
        return createNode('NonTerminal', name, name);
      }
      
      var string = String();
      if (string)
      {
        return createNode('String', string.filtered, string.entire);
      }
      
      if (accept('.'))
      {
        return createNode('Any', '', '.');
      }
      
      var range = Range();
      if (range)
      {
        return createNode('Range', range.filtered, range.entire);
      }
      
      if (accept('('))
      {
        var result = expect(Call(2, Expression0), "Expected an expression within the parentheses");
        expect(')');
        return result;
      }
    };
    
    // Identifier = [a-zA-Z_][a-zA-Z_0-9]*
    var Identifier = function()
    {
      if (!accept(/[a-zA-Z_]/))
        return;
      
      var string = '';
      string += lastAccepted;
      
      while (text[index] !== undefined && /[a-zA-Z_0-9]/.test(text[index]))
      {
        string += text[index];
        ++index;
      }
      
      eatWhitespace();
      return string;
    }
    
    // String = '"' ([^\\"] | '\\' .)* '"' | "'" ([^\\'] | '\\' .)* "'"
    var String = function()
    {
      if (accept('"'))
      {
        var filtered = '';
        var entire = lastAccepted;
        while (accept(/[^"]/))
        {
          entire += lastAccepted;
          if (lastAccepted == '\\')
          {
            expect(/./);
            entire += lastAccepted;
          }
          filtered += lastAccepted;
        }
        expect('"');
        entire += lastAccepted;
        return { filtered: filtered, entire : entire };
      }
      else if (accept("'"))
      {
        var filtered = '';
        var entire = lastAccepted;
        while (accept(/[^']/))
        {
          entire += lastAccepted;
          if (lastAccepted == '\\')
          {
            expect(/./);
            entire += lastAccepted;
          }
          filtered += lastAccepted;
        }
        expect("'");
        entire += lastAccepted;
        return { filtered: filtered, entire : entire };
      }
    }
    
    // Range = '[' ([^\\\]] | '\\' .)* ']'
    var Range = function()
    {
      if (accept('['))
      {
        var filtered = '';
        var entire = lastAccepted;
        while (accept(/[^\]]/))
        {
          entire += lastAccepted;
          if (lastAccepted == '\\')
          {
            expect(/./);
            entire += lastAccepted;
          }
          filtered += lastAccepted;
        }
        expect(']');
        entire += lastAccepted;
        return { filtered: filtered, entire : entire };
      }
    }
    
    var errorMessage = null;
    
    try
    {
      result.output = Call(0, Rules);
    }
    catch (error)
    {
      // We throw false when the algorithm hits the end (not on a parsing error)
      if (error)
        errorMessage = error;
    }
    
    result.postRun.push(function()
    {
      if (errorMessage)
      {
        grammar.session.setAnnotations(
          [{
              row: line,
              column: character,
              text: errorMessage,
              type: 'error'
          }]);
      }
      
      grammar.editor.highlight(grammarStartIndex, grammarEndIndex);
      
      pseudoEditor.highlight(pseudoStartLine, pseudoEndLine, true);
      pseudoEditor.hover =
      {
        Rules: 'Schmools'
      };
    });
    return result;
  };
  
  container.welpView.update = function()
  {
    welp.runAlgorithm(container, algorithm, slider);
  };
});
