/************************************************************************************************/
welp.addView('ebnf_to_bnf', 'EBNF To BNF', [welp.views.grammar, welp.views.ebnf_tree], function(container, state)
{
  var grammar = welp.views.grammar;
  var ebnf_tree = welp.views.ebnf_tree;
  
  var pseudoCode =
    "a\n" +
    "text\n";
  
  var slider = welp.createSlider(container);
  
  var bnf = welp.createTextEditor(container);
  
  var pseudoEditor = welp.createPseudoCode(container, pseudoCode, "ace/mode/javascript");
  
  var algorithm = function(maxSteps)
  {
    var rules = [];
    var ruleMap = {};
    
    var result =
    {
      steps: 0,
      output: rules,
      postRun: []
    };
    
    result.postRun.push(function()
    {
      var text = '';
      for (var i = 0; i < rules.length; ++i)
      {
        var rule = rules[i];
        for (var p = 0; p < rule.length; ++p)
        {
          var production = rule[p];
          
          text += rule.name + ' =';
          
          for (var e = 0; e < production.length; ++e)
          {
            var element = production[e];
            
            if (typeof(element) == 'string')
              text += " '" + element + "'";
            else
              text += ' ' + element.name;
          }
          
            if (production.length == 0)
              text += ' ';
            
            text += ';\n';
        }
      }
      
      grammar.editor.clearHighlights();
      pseudoEditor.clearHighlights();
      pseudoEditor.hover =
      {
        text: text
      };
      bnf.setValue(text, -1);
    });
    
    // We always take an implicit step at the beginning to have an empty state
    if (result.steps++ >= maxSteps || !ebnf_tree.output)
      return result;
    
    var createUniqueRule = function(name)
    {
      var index = 0;
      var uniqueName = name;
      while (ruleMap[uniqueName])
      {
        uniqueName = name + index;
        ++index;
      }
      
      var rule = [];
      rule.name = uniqueName;
      ruleMap[uniqueName] = rule;
      rules.push(rule);
      return rule;
    };
    
    var createOrFindRule = function(name)
    {
      var rule = ruleMap[name];
      if (!rule)
        rule = createUniqueRule(name);
      return rule;
    }
    
    var convertChildren = function(node, rule, production)
    {
      if (result.steps++ >= maxSteps) throw false;
      
      for (var i = 0; i < node.children.length; ++i)
      {
        var child = node.children[i];
        convert(child, rule, production);
      }
    }
    
    var convert = function(node, rule, production)
    {
      if (node.type == 'Rules')
      {
        convertChildren(node, rule, production);
      }
      if (node.type == 'Rule')
      {
        rule = createOrFindRule(node.content);
        
        production = [];
        rule.push(production);
        convertChildren(node, rule, production);
      }
      else if (node.type == 'Union')
      {
        rule = createUniqueRule(rule.name);
        production.push(rule);
        
        if (result.steps++ >= maxSteps) throw false;
        
        for (var i = 0; i < node.children.length; ++i)
        {
          var child = node.children[i];
          
          production = [];
          rule.push(production);
          convert(child, rule, production);
        }
      }
      else if (node.type == 'ZeroOrMore' || node.type == 'OneOrMore' || node.type == 'Optional')
      {
        // E = AB*C
        
        // E = AZC
        // Z = 
        // Z = BZ
        
        // E = ABZC
        if (node.type == 'OneOrMore')
          convertChildren(node, rule, production);
        
        // Z
        rule = createUniqueRule(rule.name);
        production.push(rule);
        
        // Z = 
        rule.push([]);
        
        // Z = BZ
        production = [];
        rule.push(production);
        convertChildren(node, rule, production);
        
        if (node.type != 'Optional')
          production.push(rule);
      }
      else if (node.type == 'NonTerminal')
      {
        var nonTerminalRule = createOrFindRule(node.content);
        production.push(nonTerminalRule);
      }
      else if (node.type == 'String')
      {
        for (var i = 0; i < node.content.length; ++i)
          production.push(node.content[i]);
      }
    }
    
    try
    {
      convert(ebnf_tree.output);
    }
    catch (error)
    {
      // We throw false when the algorithm hits the end (not on a parsing error)
      if (error !== false)
        throw error;
    }
    
    // A = X
    // A = 'c'
    // X = 'a'
    // X = 'b'
    
    // A = 'a'
    // A = 'b'
    // A = 'c'
    
    // Need reference counts for rules (if none are referencing, we remove them)
    
    for (var i = 0; i < rules.length; ++i)
    {
      var rule = rules[i];
      for (var p = 0; p < rule.length; ++p)
      {
        var production = rule[p];
        if (production.length != 1)
          continue;
        
        var nonTerminal = production[0];
        if (typeof(nonTerminal) != 'object')
          continue;
        
        // Remove the current unit production
        rule.splice(p, 1);
        
        for (var s = 0; s < nonTerminal.length; ++s)
        {
          var subProduction = nonTerminal[s];
          rule.splice(p + s, 0, subProduction);
        }
        
        --p;
      }
    }
    
    return result;
  };
  
  container.welpView.update = function()
  {
    welp.runAlgorithm(container, algorithm, slider);
  };
});
