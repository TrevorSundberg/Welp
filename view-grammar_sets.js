/************************************************************************************************/
welp.addView('grammar_sets', 'Grammar Sets', [welp.views.grammar, welp.views.ebnf_to_bnf], function(container, state)
{
  var grammar = welp.views.grammar;
  var ebnf_to_bnf = welp.views.ebnf_to_bnf;
  
  var pseudoCode =
    "a\n" +
    "text\n";
  
  var slider = welp.createSlider(container);
  
  var tables = welp.createPartQuery(container);
  
  // The key column will be non-terminals
  var firstTable = $('<table></table>').appendTo(tables);
  var followTable = $('<table></table>').appendTo(tables);
  var nullableTable = $('<table></table>').appendTo(tables);

  // The key column will be full productions
  var predictTable = $('<table></table>').appendTo(tables);
  
  // The key column will be productions with an item marker (.)
  var firstItemsTable = $('<table></table>').appendTo(tables);
  
  var pseudoEditor = welp.createPseudoCode(container, pseudoCode, "ace/mode/javascript");
  
  var algorithm = function(maxSteps)
  {
    var result =
    {
      steps: 0,
      output: null,
      postRun: []
    };
    
    result.postRun.push(function()
    {
      //grammar.editor.clearHighlights();
      //pseudoEditor.clearHighlights();
      //pseudoEditor.hover =
      //{
      //  text: text
      //};
      //bnf.setValue(text, -1);
    });
    
    // We always take an implicit step at the beginning to have an empty state
    if (result.steps++ >= maxSteps || !ebnf_to_bnf.output)
      return result;
    
    return result;
  };
  
  container.welpView.update = function()
  {
    welp.runAlgorithm(container, algorithm, slider);
  };
});
