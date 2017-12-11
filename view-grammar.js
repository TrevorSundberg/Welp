/************************************************************************************************/
welp.addView('grammar', 'Grammar', [], function(container, state, view)
{
  var editor = welp.createTextEditor(container);
  var session = editor.getSession();

  view.text = '';
  
  session.on('change', function(e)
  {
    view.text = editor.getValue();
    view.markAsModified();
  });
});
