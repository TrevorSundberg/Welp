/************************************************************************************************/
welp.addView('example', 'Example', [welp.views.grammar], function(container, state)
{
  var pseudoCode =
    'var prevNode = null;\n' +
    'for (var char in text)\n' +
    '{\n' +
    '  node = FindOrCreateNode(char);\n' +
    '  \n' +
    '  if (prevNode !== null)\n' +
    '    edge = FindOrCreateEdge(prevNode, node);\n' +
    '  \n' +
    '  prevNode = node;\n' +
    '}';
  
  var grammar = welp.views.grammar;
  
  var slider = welp.createSlider(container);
  
  var graph = welp.createGraph(container);
  
  var pseudoEditor = welp.createPseudoCode(container, pseudoCode, "ace/mode/javascript");
  
  var algorithm = function(maxSteps)
  {
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet();
    
    var text = grammar.text;
    
    var result =
    {
      steps: 0,
      postRun: []
    };
    
    result.postRun.push(function()
    {
      grammar.editor.clearHighlights();
      pseudoEditor.clearHighlights();
      pseudoEditor.hover =
      {
        text: text
      };
      welp.updateGraph(graph, nodes, edges);
    });
    
    // We always take an implicit step at the beginning to have an empty state
    if (result.steps++ >= maxSteps)
      return result;
    
    var lastVal = null;
    for (var i = 0; i < text.length; ++i)
    {
      var val = text[i];
      nodes.update({ id: val, label: val });
      
      if (result.steps++ >= maxSteps)
      {
        result.postRun.push(function()
        {
          grammar.editor.highlight(i, i + 1);
          pseudoEditor.highlight(3, 3, true);
          pseudoEditor.hover.char = val;
          pseudoEditor.hover.prevNode = 'node(' + lastVal + ')';
          pseudoEditor.hover.node = 'node(' + val + ')';
        });
        return result;
      }
      
      if (lastVal != null)
      {
        var id = lastVal + " -> " + val;
        edges.update({ id: id, from: lastVal, to: val });
        
        if (result.steps++ >= maxSteps)
        {
          result.postRun.push(function()
          {
            grammar.editor.highlight(i - 1, i + 1);
            pseudoEditor.highlight(5, 6, true);
            pseudoEditor.hover.char = val;
            pseudoEditor.hover.prevNode = 'node(' + lastVal + ')';
            pseudoEditor.hover.node = 'node(' + val + ')';
            pseudoEditor.hover.edge = id;
          });
          return result;
        }
      }
      lastVal = val;
    }
    
    return result;
  };
  
  container.welpView.update = function()
  {
    welp.runAlgorithm(container, algorithm, slider);
  };
});
