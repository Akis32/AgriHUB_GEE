var S2 = ee.ImageCollection("COPERNICUS/S2_SR"),
    LISB = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017"),
    Corine = ee.Image("COPERNICUS/CORINE/V20/100m/2018"),
    geometry = /* color: #ffff00 */ee.Geometry.MultiPoint();



//*********************************************INPUTS****************************************************************//


//Reference image collection start
var RF_Date_Start_Input = ui.Textbox({
  placeholder: "Enter start date (yyyy-mm-dd)",
  style: { width: '200px' }
});


//Current image collection start
var CS_Date_End_Input = ui.Textbox({
  placeholder: "Enter end date (yyyy-mm-dd)",
  style: { width: '200px' }
});

//*********************************************GENERAL FUNCTIONS AND VARIABLES****************************************************************//

//******************************************************Input processing
RF_Date_Start_Input.onChange(updateSelectedDates);
CS_Date_End_Input.onChange(updateSelectedDates);

// Function to validate and process user input
function processUserInput(input) {
  var datePattern = /^([0-9]{4})-(0[1-9]|1[0-2])-([0-9]{2})$/;
  if (datePattern.test(input)) {
    return input; // Return the input date as is
  } else {
    return null;
  }
}

// Function to update selected dates
function updateSelectedDates() {
  var startInput = RF_Date_Start_Input.getValue();
  var endInput = CS_Date_End_Input.getValue();
  
  var formattedStart = processUserInput(startInput);
  var formattedEnd = processUserInput(endInput);
  
  if (formattedStart && formattedEnd) {
    print("Selected Start Date:", formattedStart);
    print("Selected End Date:", formattedEnd);
    // Use the formatted dates for further processing
  } else {
    print("Invalid date format. Please use yyyy-mm-dd format.");
  }
}

// Remove layers
function removelay(){
  
  var lay = Map.layers().get(0);
  if(lay){
  Map.remove(lay)}

  else{print('layer missing')}
  
}

//Add NDVI function
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

//Add NDMI function
var addNDMI = function(image) {
  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  return image.addBands(ndmi);
};

//Add EVI function
var addEVI = function(image) {
  var evi = image.expression(
  '2.5 * ((NIR-RED) / (NIR + 6 * RED - 7.5* BLUE +1))', {
    NIR:image.select('B8'),
    RED:image.select('B4'),
    BLUE:image.select('B2')
  }).rename('EVI');
  return image.addBands(evi);
};

//Get the drawing tools widget object,
//define it as a variable for convenience in recalling it later.
var drawingTools = Map.drawingTools();

drawingTools.setShown(true);

//Setup a while loop to clear all existing geometries 
//that have been added as imports from drawing tools 
//(from previously running the script).
while (drawingTools.layers().length() > 0) {
  var layer = drawingTools.layers().get(0);
  drawingTools.layers().remove(layer);
}

//Initialize a dummy GeometryLayer with null geometry 
//to act as a placeholder for drawn geometries.
var dummyGeometry =
    ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '#FFFF00'});

drawingTools.layers().add(dummyGeometry);


//Define the geometry clearing function.
function clearGeometry() {
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}

//Define functions that will be called when 
//each respective drawing button is clicked.
function drawRectangle() {
  clearGeometry();
  drawingTools.setShape('point');
  drawingTools.draw();
}

// Function to mask clouds
function s2ClearSky(image) {
      var scl = image.select('SCL');
      var clear_sky_pixels = scl.eq(1).or(scl.eq(2)).or(scl.eq(3)).or(scl.eq(4)).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(10)).or(scl.eq(11));
      return image.updateMask(clear_sky_pixels);
}

//Visualization

//Creates a color bar thumbnail image for use in legend from the given color palette.
function makeColorBarParams(palette) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x10',
    format: 'png',
    min: 0,
    max: 1,
    palette: palette,
  };
}

var visEVI = {min: -2, max: 2, palette: 
  [
    'CE4078', 'FFA1B9', 'FCCBEC', 'ECE167', '90C87C'
  ]};

var visNDMI = {min: -0.5, max: 0.8, palette: 
 ['FF0000', 'FF4500', 'FF8C00', 'FFD700',
 '87CEEB', '4169E1', '0000FF', '000080']};
 
var visNDVI = {min: -0.1, max: 0.8, palette: [
  'B8B8B8', 'CE7E45', 'FCD163', '66A000', '207401',
  '056201', '004C00', '023B01', '012E01', '011301']};

var Country_select = LISB.filter(ee.Filter.equals('country_na', "Greece"));

var CorineLC2018 = Corine.select('landcover');

var LCdict =
  {
  111: "Continuous urban fabric",
  112: "Discontinuous urban fabric",
  121: "Industrial or commercial units",
  122: "Road and rail networks and associated land",
  123: "Port areas",
  124: "Airports",
  131: "Mineral extraction sites",
  132: "Dump sites",
  133: "Construction sites",
  141: "Green urban areas",
  142: "Sport and leisure facilities",
  211: "Non-irrigated arable land",
  212: "Permanently irrigated land",
  213: "Rice fields",
  221: "Vineyards",
  222: "Fruit trees and berry plantations",
  223: "Olive groves",
  231: "Pastures",
  241: "Annual crops associated with permanent crops",
  242: "Complex cultivation patterns",
  243: "Land principally occupied by agriculture, with significant areas of natural vegetation",
  244: "Agro-forestry areas",
  311: "Broad-leaved forest",
  312: "Coniferous forest",
  313: "Mixed forest",
  321: "Natural grasslands",
  322: "Moors and heathland",
  323: "Sclerophyllous vegetation",
  324: "Transitional woodland-shrub",
  331: "Beaches, dunes, and sand plains",
  332: "Bare rocks",
  333: "Sparsely vegetated areas",
  334: "Burnt areas",
  335: "Glaciers and perpetual snow",
  411: "Inland marshes",
  412: "Peat bogs",
  421: "Salt flats",
  422: "Salines",
  423: "Intertidal flats",
  511: "Water courses",
  512: "Water bodies",
  521: "Coastal lagoons",
  522: "Estuaries",
  523: "Sea and ocean",
  999: "NODATA",
  };
  
//****************************************MAIN FUNCTIONS***************************************************//

function model(){
  
  Legend.clear();
  
  //Zoom to Greece
  Map.centerObject(Country_select);
  
  var RF_Date_Start_format = processUserInput(RF_Date_Start_Input.getValue());
  var CS_Date_End_format = processUserInput(CS_Date_End_Input.getValue());
  
  var RF_Date_End_format = ee.Date(RF_Date_Start_format).advance(1,'month');
  var CS_Date_Start_format = ee.Date(CS_Date_End_format).advance(-1,'month');
  
  var CorineLC2018_Clip = CorineLC2018.clip(Country_select);
  
  //Current image
  var collection_CS = S2.filterDate(CS_Date_Start_format, CS_Date_End_format)
      .sort('CLOUDY_PIXEL_PERCENTAGE', false)
      .filterBounds(Country_select)
      .map(addNDVI).map(addNDMI).map(addEVI);
      
  var CS_Img = ee.Image(collection_CS.median()).clip(Country_select);
  
  //Layer to add on the map
  removelay();
  removelay();
  removelay();
  
  Map.addLayer(CS_Img.select('NDVI'),visNDVI,'NDVI');
  Map.addLayer(CS_Img.select('NDMI'),visNDMI,'NDMI');
  Map.addLayer(CS_Img.select('EVI'),visEVI,'EVI');
  
 // Create the NDVI color bar for the legend.
  var legendLabels_NDVI = ui.Panel({
    widgets: [
    ui.Label('Low', {margin: '4px 8px'}),
    ui.Label('High', {margin: '4px 8px',textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  
    
  var colorBar_NDVI = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(visNDVI.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });

  var legendTitle_NDVI = ui.Label({
    value: 'NDVI',
    style: {fontWeight: 'bold'}
  });

  var legendPanel_NDVI = ui.Panel([legendTitle_NDVI, colorBar_NDVI, legendLabels_NDVI]);
  
  Legend.widgets().set(3, legendPanel_NDVI);
  
  // Create the NDMI color bar for the legend.
    var legendLabels_NDMI = ui.Panel({
    widgets: [
    ui.Label('Low', {margin: '4px 8px'}),
    ui.Label('High', {margin: '4px 8px',textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  
  var colorBar_NDMI = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(visNDMI.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });

  var legendTitle_NDMI = ui.Label({
    value: 'NDMI',
    style: {fontWeight: 'bold'}
  });

  var legendPanel_NDMI = ui.Panel([legendTitle_NDMI, colorBar_NDMI, legendLabels_NDMI]);
  
  Legend.widgets().set(3, legendPanel_NDMI);
 

  // Create the EVI color bar for the legend.
    var legendLabels_EVI = ui.Panel({
    widgets: [
    ui.Label('Low', {margin: '4px 8px'}),
    ui.Label('High', {margin: '4px 8px',textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  
  var colorBar_EVI = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(visEVI.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });

  var legendTitle_EVI = ui.Label({
    value: 'EVI',
    style: {fontWeight: 'bold'}
  });

  var legendPanel_EVI = ui.Panel([legendTitle_EVI, colorBar_EVI, legendLabels_EVI]);
  
  Legend.widgets().set(3, legendPanel_EVI);
 
}


function Timeseries(){
  
  resultspanel.clear();

  Map.add(resultspanel);

  
  var AOI = drawingTools.layers().get(0).getEeObject();
  
  var Date_Start = processUserInput(RF_Date_Start_Input.getValue());
  var Date_End = processUserInput(CS_Date_End_Input.getValue());
  
  
  var collection = S2.filterDate(Date_Start,Date_End)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .filter(ee.Filter.bounds(AOI))
  .map(s2ClearSky)
  .map(addNDVI).map(addNDMI).map(addEVI);
  
  //Moving window smoothing
  // Specify the time-window
  var days = 15;

  // Convert to milliseconds 
  var millis = ee.Number(days).multiply(1000*60*60*24);

  //Select the type of join
  var join = ee.Join.saveAll({
  matchesKey: 'images'
  });

  //Create a filter
  var diffFilter = ee.Filter.maxDifference({
  difference: millis,
  leftField: 'system:time_start', 
  rightField: 'system:time_start'
  });
  
  //Apply filter to image join
  var joinedCollection = join.apply({
  primary: collection, 
  secondary: collection, 
  condition: diffFilter
  });
  
  // Each image in the joined collection will contain
  // matching images in the 'images' property
  // Extract and return the mean of matched images
  var extractAndComputeMean = function(image) {
    var matchingImages = ee.ImageCollection.fromImages(image.get('images'));
    var meanImage = matchingImages.reduce(
      ee.Reducer.median().setOutputs(['average']));
    return ee.Image(image).addBands(meanImage);
  };

  var smoothedCollection = ee.ImageCollection(
    joinedCollection.map(extractAndComputeMean));

  //-------------------------------------------------------NDVI timeseries-----------------------------------------//
  // Display NDVI time-series chart
  var chartNDVI = ui.Chart.image.series({
    imageCollection: smoothedCollection.select('NDVI_average'),
    region: AOI,
    reducer: ee.Reducer.mean(),
    scale: 10
  }).setOptions({
        title: 'NDVI Time Series',
        interpolateNulls: true,
        vAxis: {title: 'NDVI', viewWindow: {min: -1, max: 1}},
        hAxis: {title: '', format: 'YYYY-MM', gridlines: {count: 6}},
        lineWidth: 1,
        pointSize: 4,
        series: {
          0: {color: '#238b45'},
      },
      
  });
  
  resultspanel.add(ui.Label({
    value: "Click on timeseries to visualize the NDVI image from timeseries",
    style: { fontWeight: "bold" }
  }));
    
  resultspanel.add(chartNDVI);
  
  // When the chart is clicked, update the map and label.
  chartNDVI.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return;  // Selection was cleared.

  // Show the image for the clicked date.
    var equalDate = ee.Filter.equals('system:time_start', xValue);
    var image = ee.Image(smoothedCollection.filter(equalDate).first().select('NDVI_average'));
    var lay = Map.layers().get(3);
    if(lay){Map.remove(lay)}
    Map.addLayer(image,visNDVI,'Index from timeseries');
  });
  

  //-------------------------------------------------------NDMI timeseries-----------------------------------------//
  // Display NDVI time-series chart
  var chartNDMI = ui.Chart.image.series({
    imageCollection: smoothedCollection.select('NDMI_average'),
    region: AOI,
    reducer: ee.Reducer.mean(),
    scale: 10
  }).setOptions({
        title: 'NDMI Time Series',
        interpolateNulls: true,
        vAxis: {title: 'NDMI', viewWindow: {min: -1, max: 1}},
        hAxis: {title: '', format: 'YYYY-MM', gridlines: {count: 6}},
        lineWidth: 1,
        pointSize: 4,
        series: {
          0: {color: '#0000FF'},
      },
      
  });
  
  resultspanel.add(ui.Label({
    value: "Click on timeseries to visualize the NDMI image from timeseries",
    style: { fontWeight: "bold" }
  }));
    
  resultspanel.add(chartNDMI);
  
  // When the chart is clicked, update the map and label.
  chartNDMI.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return;  // Selection was cleared.

  // Show the image for the clicked date.
    var equalDate = ee.Filter.equals('system:time_start', xValue);
    var image = ee.Image(smoothedCollection.filter(equalDate).first().select('NDMI_average'));
    var lay = Map.layers().get(3);
    if(lay){Map.remove(lay)}
    Map.addLayer(image,visNDMI,'Index from timeseries');
  });

//-------------------------------------------------------EVI timeseries-----------------------------------------//
  // Display NDVI time-series chart
  var chartEVI = ui.Chart.image.series({
    imageCollection: smoothedCollection.select('EVI_average'),
    region: AOI,
    reducer: ee.Reducer.mean(),
    scale: 10
  }).setOptions({
        title: 'EVI Time Series',
        interpolateNulls: true,
        vAxis: {title: 'EVI', viewWindow: {min: -4.5, max: 4.5}},
        hAxis: {title: '', format: 'YYYY-MM', gridlines: {count: 6}},
        lineWidth: 1,
        pointSize: 4,
        series: {
          0: {color: '#FFA1B9'},
      },
      
  });
      
  print(smoothedCollection);
  
  resultspanel.add(ui.Label({
    value: "Click on timeseries to visualize the EVI image from timeseries",
    style: { fontWeight: "bold" }
  }));
    
  resultspanel.add(chartEVI);
  
  // When the chart is clicked, update the map and label.
  chartEVI.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return;  // Selection was cleared.

  // Show the image for the clicked date.
    var equalDate = ee.Filter.equals('system:time_start', xValue);
    var image = ee.Image(smoothedCollection.filter(equalDate).first().select('EVI_average'));
    var lay = Map.layers().get(3);
    if(lay){Map.remove(lay)}
    Map.addLayer(image,visEVI,'Index from timeseries');
  });

  //Add Land Cover info
  var landCover = CorineLC2018.reduceRegion({
      geometry: AOI,
      scale: 10,
      reducer: ee.Reducer.first()});
      
  
  
  var LabelLC = landCover.evaluate(function(result) {
    
    var LandCoverText = ui.Label({
        value: "Pixel Land Cover: " +result.landcover + " " + LCdict[result.landcover],
        style: {
          fontWeight: "bold",
          fontSize: "14px",
          margin: "10px"
        }
      });
  
    resultspanel.add(LandCoverText);

  }); 
}
//*********************************************UI**********************************************************//


//*************************PANELS
// Add main panel
var panel = ui.Panel({
  style: {
    backgroundColor: 'white',
    border: '1px solid black',
    padding: '5px',
    width: '300px',
    position:'middle-left'
  }
});
Map.add(panel);

//Create a legend panel
var Legend = ui.Panel({
  style: {
    backgroundColor: 'white',
    border: '1px solid black',
    padding: '5px',
    width: '300px',
    position:'bottom-left'
  }
});

Map.add(Legend);

  
//Create a results panel
var resultspanel = ui.Panel({
 style: {
    backgroundColor: 'white',
    border: '1px solid black',
    padding: '5px',
    width: '500px',
    position:'bottom-right'
  }
});

//Define a ui.Panel to hold 
//app instructions and the geometry drawing buttons.

var controlPanel = ui.Panel({
   style: {
    backgroundColor: 'white',
    border: '1px solid black',
    padding: '5px',
    width: '300px',
    position:'top-left'
  },
  widgets: [
    ui.Label('Draw/Erase a point to view timeseries'),
    ui.Button({
      label: ' Point',
      onClick: drawRectangle,
      style: {stretch: 'horizontal',Color:'#4863A0'}
    }),
    ],
  layout: null,
});

Map.add(controlPanel);

//Date inputs
panel.add(ui.Label({
  value: "Select start and end date",
  style: { fontWeight: "bold" }
}));


panel.add(RF_Date_Start_Input);


panel.add(CS_Date_End_Input);

//Model run button
var model_run = ui.Button({
  label: "Run model",
  onClick: model, // Call the displayAFImage function
  style: {
    stretch: "horizontal",
    height:'50px',
    fontWeight:'50px',
    Color:'#4863A0'
  }
});

panel.add(model_run);

// Create timeseries button
var TimeseriesButton = ui.Button({
  label: "Create timeseries",
  onClick: Timeseries,
  style: {
    stretch: "horizontal",
    height:'50px',
    fontWeight:'50px',
    Color:'#4863A0'
  }
});

panel.add(TimeseriesButton);
