/************************************************************************************************/
// Setup all the globals for our framework
var welp =
{
  views: {},
  tooltip: null,
  layout: new GoldenLayout(
  {
    settings:
    {
      showPopoutIcon: false
    },
    //content: [ { type: 'row', } ]
    
    
    content:
    [
      {
        type: 'row',
        content:
        [
          {
            type:'component',
            componentName: 'grammar',
            componentState: { }
          },
          {
            type:'component',
            componentName: 'example',
            componentState: { }
          },
          {
            type:'component',
            componentName: 'ebnf_tree',
            componentState: { }
          },
          {
            type:'component',
            componentName: 'ebnf_to_bnf',
            componentState: { }
          }
        ]
      }
    ]
  }),
  
  updateOrder: []
};

/************************************************************************************************/
// Pull in required 'ace' primitives
var Range = ace.require('ace/range').Range;
var Search = ace.require('ace/search').Search;

/************************************************************************************************/
welp.update = function()
{
  // Update all the objects first
  for (var i = welp.updateOrder.length - 1; i >= 0; --i)
  {
    var view = welp.updateOrder[i];
    if (view.update !== undefined)
      view.update();
    view.modified = false;
  }
  
  welp.updateOrder = [];
}

/************************************************************************************************/
welp.addView = function(uniqueName, title, dependencies, createView, update)
{
  // Create an object for the view.
  var view = 
  {
    dependencies: dependencies,
    dependents: [],
    uniqueName: uniqueName,
    modified: false,
    visible: false,
    update: update,
    container: null
  };
  
  view.markAsModified = function()
  {
    if (this.modified)
      return true;
    
    for (var i = 0; i < this.dependents.length; ++i)
    {
      var dependent = this.dependents[i];
      dependent.markAsModified();
    }
    
    this.modified = true;
    welp.updateOrder.push(this);
  };
  
  welp.views[uniqueName] = view;
  
  for (var i = 0; i < dependencies.length; ++i)
  {
    var dependency = dependencies[i];
    dependency.dependents.push(view);
  }
  
  welp.layout.registerComponent(uniqueName, function(container, state)
  {
    container.setTitle(title);
    container.algorithmBox = $('<div class="algorithmBox"></div>').appendTo(container.getElement());
    container.uniqueName = uniqueName;
    container.welpView = view;
    view.visible = true;
    view.container = container;
    createView(container, state, view);
  });
}

/************************************************************************************************/
welp.createPartQuery = function(container)
{
  var partQuery = $('<div class="algorithmPartFlex"></div>').appendTo(container.algorithmBox);
  partQuery.uniqueName = container.uniqueName;
  return partQuery;
}

/************************************************************************************************/
welp.createSlider = function(container)
{
  $('<h2>Move the slider to progress the algorithm.</h2>').appendTo(container.algorithmBox);
  var partQuery = $('<div class="algorithmSlider"></div>').appendTo(container.algorithmBox);
  
  var slider = partQuery.slider();
  slider.on('slide', function(event, ui)
  {
    // For some reason the slider value in 'slide' is old, so set the value right here from the event
    slider.slider('value', ui.value);
    
    // Mark our container as modified so we will update
    container.welpView.markAsModified();
  });
  
  container.welpView.slider = slider;
  slider.welpContainer = container;
  slider.welpView = container.welpView;
  return slider;
}

/************************************************************************************************/
welp.createGraph = function(container, options)
{
  var partQuery = this.createPartQuery(container);
  
  if (typeof(options) !== 'object' || options === null)
  {
    if (options === 'hierarchical')
    {
      options =
      {
        autoResize: false,
        layout:
        {
          randomSeed: 12345,
          improvedLayout: false,
          hierarchical:
          {
            enabled: true,
            sortMethod: 'directed'
          }
        },
        nodes:
        {
          chosen:
          {
            node: function(values, id, selected, hovering)
            {
              values.color = '#ff3333';
              values.borderWidth = 3;
              values.borderColor = '#990000';
              values.shadow = true;
              values.shadowX = 0;
              values.shadowY = 0;
            }
          }
        },
        edges:
        {
          smooth: false,
          arrows: 'to',
          
          chosen:
          {
            edge: function(values, id, selected, hovering)
            {
              values.color = '#ff3333';
              values.width = 2;
              values.shadow = true;
              values.shadowX = 0;
              values.shadowY = 0;
            }
          }
        },
        physics:
        {
          enabled: false
        }
      };
    }
    else
    {
      options =
      {
        autoResize: false,
        layout:
        {
          randomSeed: 12345,
          improvedLayout: true
        },
        nodes:
        {
          chosen:
          {
            node: function(values, id, selected, hovering)
            {
              values.color = '#ff3333';
              values.borderWidth = 3;
              values.borderColor = '#990000';
              values.shadow = true;
              values.shadowX = 0;
              values.shadowY = 0;
            }
          }
        },
        edges:
        {
          smooth:
          {
            type: 'dynamic'
          },
          arrows: 'to',
          
          chosen:
          {
            edge: function(values, id, selected, hovering)
            {
              values.color = '#ff3333';
              values.width = 2;
              values.shadow = true;
              values.shadowX = 0;
              values.shadowY = 0;
            }
          }
        },
        physics:
        {
          barnesHut:
          {
            damping: 0.5
          },
          minVelocity: 0.1
        }
      };
    }
  }
  
  // Create a blank data set (we need one node for some reason otherwise things don't show up)
  var data =
  {
    nodes: new vis.DataSet([{id: -1, label: '   '}], { queue: true }),
    edges: new vis.DataSet([], { queue: true })
  };
  
  var networkParent = partQuery.get(0);
  var network = new vis.Network(networkParent, data, options);
  network.networkParent = networkParent;
  network.customOptions = options;
  network.partQuery = partQuery;
  network.dstData = data;
  
  container.on('resize', function(e, f)
  {
    network.setSize(partQuery.width(), partQuery.height());
    network.redraw();
  });
  
  container.welpView.graph = network;
  network.welpContainer = container;
  network.welpView = container.welpView;
  
  return network;
}

/************************************************************************************************/
welp.updateGraph = function(network, srcNodes, srcEdges)
{
  var dstData = network.dstData;
  
  var dstNodes = dstData.nodes;
  var dstEdges = dstData.edges;
  
  if (srcNodes.length + srcEdges.length < 100)
    network.customOptions.edges.smooth.type = 'dynamic';
  else
    network.customOptions.edges.smooth.type = 'continuous';
  
  var updateDataSet = function(src, dst, updatedIds)
  {
    var srcIds = src.getIds();
    for (var i = 0; i < srcIds.length; ++i)
    {
      var id = srcIds[i];
      var srcItem = src.get(id);
      var dstItem = dst.get(id);
      
      if (dstItem == null || dstItem.label != srcItem.label)
      {
        dst.update(srcItem);
        updatedIds.push(srcItem.id);
      }
    }
    
    var dstIds = dst.getIds();
    for (var i = 0; i < dstIds.length; ++i)
    {
      var id = dstIds[i];
      var srcItem = src.get(id);
      
      if (srcItem == null)
        dst.remove(id);
    }
  };
  
  var updatedNodes = [];
  var updatedEdges = [];
  
  //network.setOptions(network.customOptions);
  
  updateDataSet(srcNodes, dstNodes, updatedNodes);
  updateDataSet(srcEdges, dstEdges, updatedEdges);
  
  dstNodes.flush();
  dstEdges.flush();
  
  if (network.customOptions.layout && network.customOptions.layout.hierarchical)
    network.fit();
  
  // Object.assign if we ever re-create the network
  network.setSelection({ nodes: updatedNodes, edges: updatedEdges}, { unselectAll: true, highlightEdges: false });
}

/************************************************************************************************/
welp.createTextEditor = function(container)
{
  var partQuery = this.createPartQuery(container);
  
  var editor = ace.edit(partQuery.get(0));
  editor.partQuery = partQuery;
  
  // Disable a warning we get about scrolling
  editor.$blockScrolling = Infinity;
  
  var session = editor.getSession();
  editor.setTheme("ace/theme/twilight");
  
  editor.clearMarkers = function(inFront)
  {
    // The documentation says this returns an Array of Ids
    // This is absolutely not true, it returns an object whose keys are ids.
    var markers = this.session.getMarkers(inFront);
    for (var i in markers)
      this.session.removeMarker(i);
  };
  
  editor.clearHighlights = function()
  {
    this.clearMarkers(false);
  };
  
  editor.highlight = function(start, end, isLine)
  {
    if (start === undefined)
      return;
    
    if (end === undefined)
      end = start;
    
    if (isLine)
    {
      this.session.addMarker(new Range(start, 0, end, 100000000), 'highlight', 'fullLine', false);
    }
    else
    {
      var startPos = editor.getRowColumnIndices(start);
      var endPos = editor.getRowColumnIndices(end);
      
      this.session.addMarker(new Range(startPos.row, startPos.column, endPos.row, endPos.column), 'highlight', 'text', false);
    }
    
    // We want any highlights to flash, but applything to an element 
    // means it may flash inadvertantly (not just after the algorithm runs)
    // We wait a frame to ensure all .highlights are created, then remove
    // any classes and re-add them to play the animation.
    setTimeout(function()
    {
      editor.partQuery.find('.highlight').removeClass('highlightAnimation');
      var interval2 = setTimeout(function()
      {
        editor.partQuery.find('.highlight').addClass('highlightAnimation');
      }, 10);
    }, 0);
  };
  
  editor.getLastColumnIndex = function(row)
  {
    return this.session.getDocumentLastRowColumnPosition(row,0).column;
  };
  
  editor.getLastColumnIndices = function()
  {
    var rows = this.session.getLength();
    var lastColumnIndices = [];
    var lastColIndex = 0;
    
    for (var i = 0; i < rows; ++i)
    {
      lastColIndex += this.getLastColumnIndex(i);
      if (i > 0)
        ++lastColIndex;
      lastColumnIndices[i] = lastColIndex;
    }
    
    return lastColumnIndices;
  };
  
  editor.getRowColumnIndices = function(characterIndex)
  {
    var lastColumnIndices = this.getLastColumnIndices();
    if (characterIndex <= lastColumnIndices[0])
      return {row: 0, column: characterIndex};
    
    var row = 1;
    for (var i = 1; i < lastColumnIndices.length; i++)
    {
      if (characterIndex > lastColumnIndices[i])
        row = i+1;
    }
    
    var column = characterIndex - lastColumnIndices[row-1] - 1;
    if (column < 0)
      column = 0;
    
    return { row: row, column: column };
  };
  
  container.welpView.editor = editor;
  editor.welpContainer = container;
  editor.welpView = container.welpView;
  
  container.welpView.session = session;
  session.welpContainer = container;
  session.welpView = container.welpView;
  
  return editor;
}

/************************************************************************************************/
welp.createPseudoCode = function(container, pseudoCode, mode)
{
  var pseudoEditor = this.createTextEditor(container);
  var pseudoCodeQuery = pseudoEditor.partQuery;
  var pseudoSession = pseudoEditor.getSession();
  if (mode) // "ace/mode/javascript"
    pseudoSession.setMode(mode);
  pseudoEditor.setReadOnly(true);
  pseudoEditor.setValue(pseudoCode, -1);
  
  pseudoEditor.partQuery.css('flex-grow', 0.25);
  
  pseudoEditor.hover = {};
  
  pseudoEditor.on("mousemove", function(e)
  {
    var position = e.getDocumentPosition();
    if(position)
    {
      // We could refactor this to get the entire line text, then look for any sub-string in 
      // our hover items and check if our cursor is inside any (take the longest one).
      var wordRange = pseudoEditor.session.getWordRange(position.row, position.column);
      var token = pseudoEditor.session.getTextRange(wordRange);
      var hoverText = pseudoEditor.hover[token];
      if (hoverText != undefined)
      {
        welp.tooltip.css('left', e.x);
        welp.tooltip.css('top', e.y);
        welp.tooltip.css('visibility', 'visible');
        if (pseudoEditor.hover[token + 'IsHtml'] === true)
          welp.tooltip.html(hoverText);
        else
          welp.tooltip.text(hoverText);
      }
      else
      {
        welp.tooltip.css('visibility', 'hidden');
      }
    }
  });
  
  pseudoCodeQuery.on("mouseout", function(e)
  {
    welp.tooltip.css('visibility', 'hidden');
  });
  
  return pseudoEditor;
}

/************************************************************************************************/
welp.queryAlgorithmSteps = 1000000000;

/************************************************************************************************/
welp.runAlgorithm = function(container, algorithmCallback, slider)
{
  var maxResult = algorithmCallback(welp.queryAlgorithmSteps);
  var result = maxResult;
  
  // Always output the furthest along result we could get
  container.welpView.output = maxResult.output;
  
  var value = slider.slider("value");
  var oldMax = slider.slider("option", "max");
  
  slider.slider("option", "max", maxResult.steps);
  
  // If the slider is all the way to the right, lock it there
  if (value == oldMax)
  {
    value = maxResult.steps;
    slider.slider("value", maxResult.steps);
  }
  
  // Call the algorithm again with the slider value
  result = algorithmCallback(value);
  
  if (result.postRun)
  {
    for (var i = 0; i < result.postRun.length; ++i)
    {
      result.postRun[i]();
    }
  }
  
  return result;
}

/************************************************************************************************/
$(function()
{
  // Create a floating tooltip that we can use anywhere
  welp.tooltip = $('<div class="codeTooltip"></div>').appendTo("body");
  
  // Initialize our docking layout
  welp.layout.init();
  
  // Updates every frame
  setInterval(welp.update, 0);
});
