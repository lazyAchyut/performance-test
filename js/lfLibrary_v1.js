;(function(window, document, undefined) {
  'use strict';

//Main controller class to handle all execution
function Main(){
  var $routeObj = null;   //LfRoute Object
  var $dataObj = null;    //LfBind Object
  var $repeatObj = null;  //LfRepeat Object
  var $dependency = null; //DependenctInjection object

  this.$isUserRoutesDefined = false;
  this.$scope = {}; //main object to hold all user defined data
  this.$routeParam = [];
  this.$rootElement = null;
  var that = this;

  this.$checkUserDefinedRoute = function(){ 
    if(typeof RouteProvider === 'function') //RouteProvider is function that should be used by user to define Routes
      that.$isUserRoutesDefined = true;
  }

  this.$initializeDataBind = function(){
    $dataObj.$registerWatcher();    //register all lf-models and lf-binds.
    $dataObj.$observeObject();      //observe $scope object, so any change on this object trigger an event.
    $dataObj.$addListener();        //add 'keyup' event to all lf-models.
    $dataObj.$initializeFirstView();  //set value to lf-model initially, if $scope object has any.
  } 

  this.$initializeRepeat = function(){
    $repeatObj.$initRepeat(); //get lf-repeat present on current view
    $repeatObj.$doRepeat();   //perform lf-repeat
    $repeatObj.$doDetail();   //perform lf-detail
  }


  this.$bootstrap = function(){
    that.$rootElement = document.querySelector('[lf-app]'); 
    if(that.$rootElement === null){ 
      return;
    }

    //instatiation of objects
    $dependency = new DependencyInjection();  //line no: 74
    $dataObj = new LfBind();                  //line no: 119
    $repeatObj = new LfRepeat();              //line no: 307
    
    that.$checkUserDefinedRoute();    //verify whether user has defined routes or not
    if(that.$isUserRoutesDefined){
      $routeObj = new LfRoute();    
      $dependency.$registerDependency('$route' , $routeObj);  //set LfRoute's object as dependency for $route as parameter 
      $dependency.$processMethods(RouteProvider);             //process and invoke RouteProvider function
      $routeObj.$doRoute();           //get current URL and render the proper view
    }

    setTimeout($dependency.$invokeUserControllers,5);  //invoke only those controllers that are used in current view
    setTimeout(that.$initializeRepeat,10); //since $invokeUserControllers is asynchronous [Bad Practice using setTimeOut eventhough]
    setTimeout(that.$initializeDataBind,10);
    window.addEventListener('hashchange' , that.$updateSerivces , false); //update the view if url is changed
  }

  this.$updateSerivces = function(){ 
    if($routeObj){        //update only if user has defined routes
      $routeObj.$doRoute();
      that.$scope = {};   //flush $scope when view is changed
      setTimeout($dependency.$invokeUserControllers,5); 
      setTimeout(that.$initializeRepeat,10);
      setTimeout(that.$initializeDataBind,10);
    }
  }
} //end of Main Class

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

//DependencyInjection section
function DependencyInjection(){
  var $dependencies = {};
  var that = this;

  this.$processMethods = function($target){ 
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var $text = $target.toString();
    var $args = $text.match(FN_ARGS)[1].split(','); 

    $target.apply($target, that.$getDependencies($args));
  }

  this.$getDependencies = function($arr){ 
    return $arr.map(function(value) {
      return $dependencies[value];
    });  
  }

  this.$registerDependency = function($name , $dependency){
    $dependencies[$name] = $dependency;
  }

  this.$getControllers = function(){ 
    return $main.$rootElement.querySelectorAll('[lf-controller]');
  }

  this.$invokeUserControllers = function(){
    var $controllerName = null;
    var $controllers = that.$getControllers(); 
    for(var i=0;i<$controllers.length;i++){ 
      $controllerName = $controllers[i].getAttribute('lf-controller').trim();
      $main.$scope[$controllerName] = {};
      that.$registerDependency('$scope' ,  $main.$scope[$controllerName]);  //pass $scope's dependency according to controller
      that.$processMethods(eval($controllerName));
    }
  }
}//end of DependencyInjection

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

//data binding section
function LfBind(){
  var $watchModels = [];  //models to watch for
  var $watchBinds = [];   //binds to watch for
  var that = this;

  this.$registerWatcher = function(){   
    $watchModels = $main.$rootElement.querySelectorAll('[lf-model]'); 
    $watchBinds = $main.$rootElement.querySelectorAll('[lf-bind]');
  }

  this.$observeObject = function(){
    //observe changes in $scope object, if any change is detected it updates respective models and bind
    Object.observe($main.$scope, function(changes){
      changes.forEach(function(change) {
        that.$updateView(change.name);
      });
    });
  }

  this.$addListener = function(){ 
    var index = null;
    var key = null;
    var value = null;
    for(var i = 0, len = $watchModels.length; i < len; i++){
      $watchModels[i].count = i;
      $watchModels[i].addEventListener('keyup' , function(evt)
      { 
        index = evt.target.count;
        key = $watchModels[index].getAttribute('lf-model');
        value = $watchModels[index].value;
        $main.$scope[key] = value;
      });
    }
  }
  
  //updates the model and binds with data if initially present in scope object
  this.$initializeFirstView = function(){   
    var $elementName = null;
    for(var i = 0, len = $watchModels.length; i < len; i++){
      $elementName = $watchModels[i].getAttribute('lf-model');  
      if($main.$scope.hasOwnProperty($elementName)){
        $watchModels[i].value = $main.$scope[$elementName];
        $watchModels[i].innerHTML = $main.$scope[$elementName];
      }
    }
    for(var i = 0, len = $watchBinds.length; i < len; i++){
      $elementName = $watchBinds[i].getAttribute('lf-bind');  
      if($main.$scope.hasOwnProperty($elementName)){
        $watchBinds[i].value = $main.$scope[$elementName];
        $watchBinds[i].innerHTML = $main.$scope[$elementName];
      }
    }
  } 

  //search and update all bind and models of changed variable
  this.$updateView = function($changedElementName){
    for(var j = 0, len = $watchModels.length; j < len; j++){
      if($changedElementName === $watchModels[j].getAttribute('lf-model')){
        $watchModels[j].value = $main.$scope[$changedElementName];
        $watchModels[j].innerHTML = $main.$scope[$changedElementName];
      }
    } 
    for(var j = 0, len = $watchBinds.length; j < len; j++){
      if($changedElementName === $watchBinds[j].getAttribute('lf-bind')){
        $watchBinds[j].value = $main.$scope[$changedElementName];
        $watchBinds[j].innerHTML = $main.$scope[$changedElementName];
      }
    }     
  }
} //end of LfBind

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

//routing section
function LfRoute(){
    this.$userDefinedRoutes = {};     //stores user defined routes  
    var $xhr;                         //XMLHttpRequest object
    var that = this;

    this.$doRoute = function(){ 
      var $matchedRoute = []; //holds route and templateUrl of matched route
      var $urlAfterHash = ''; //portion of url after '#'
      var $currentUrl;      
      var $parsedUrl = [];    //url components parsed by delimiter '#'
      var $currentDir;
      var $redirectPath;
      var $path;              //path from where partials is to be fetched
      var $container = document.querySelector('[lf-view]');

      $currentUrl = document.URL
      $parsedUrl = that.$parseStr($currentUrl , '#');
      $currentDir = $parsedUrl[0].substr(0,$parsedUrl[0].lastIndexOf('/'));

      if(($parsedUrl[1] != null && $parsedUrl[1] != '')){ 
        $urlAfterHash = $parsedUrl[1];
        $matchedRoute = that.$mapUrlAfterHash($urlAfterHash);
        
        if($matchedRoute != null){
          $path = $currentDir + $matchedRoute.templateUrl.trim(); //templateUrl is name of partial file
          that.$loadView($container , $path);
        }
        else{ 
          $redirectPath = that.$getOtherwisePath(that.$userDefinedRoutes);
          if($redirectPath != null ){
            window.location.href = $parsedUrl[0] + '#' + $redirectPath;  //set url to redirected url
            $matchedRoute = that.$mapUrlAfterHash($redirectPath); 
            $path =  $currentDir + $matchedRoute.templateUrl.trim();
            that.$loadView($container , $path);
          }   
        } 
      }
    }

    this.$parseStr = function(str,delimiter){ 
      return str.split(delimiter);
    }

    //returns matched route's path and templateUrl
    this.$mapUrlAfterHash = function($urlAfterHash){
      var $tempParsedPath = []; //parsed current url component by  delimiter '/'
      var $tempJson = {}; //holds each single json object from userdefined json array
      var $flag  = true;    //boolean to determine url matches or not

      $tempParsedPath = that.$parseStr($urlAfterHash , '/');  
      $tempParsedPath = $tempParsedPath.filter(Boolean); //remove empty strings from array
      for(var i = 0; i<that.$userDefinedRoutes.length-1;i++){  //dont check otherwise part in $userDefinedRoutes
        $tempJson = that.$parseStr(that.$userDefinedRoutes[i].when , '/');  
        $tempJson = $tempJson.filter(Boolean); 
        $flag = true;
        if($tempParsedPath.length == $tempJson.length){
          for(var j=0; j<$tempParsedPath.length;j++){
            if($tempParsedPath[j] === $tempJson[j]){
              continue;
            }
            else if($tempJson[j].substr(0,1) === ':'){    //if userDefinedRoutes has :id then assign value to id
              $main.$routeParam[$tempJson[j].substr(1)] = $tempParsedPath[j];
            }
            else{
              $flag = false;
              break;
            }
          }
          if($flag === true)
            return that.$userDefinedRoutes[i];
        }
      }
    }

    //returns redirectTO url of otherwise property in user defined route
    this.$getOtherwisePath = function(){
      for(var i in that.$userDefinedRoutes){ 
        if(that.$userDefinedRoutes[i].otherwise == '')
          return that.$userDefinedRoutes[i].redirectTo;
      }
    }
    
    //render $container(lf-view) with content from $path    
    this.$loadView = function($container,$path){ 
      $xhr = that.$getXhr();
      $xhr.onreadystatechange = function () {
        if ($xhr.readyState === 4 && $xhr.status == 200) {  
         $container.innerHTML = $xhr.responseText;
       }
     }
     $xhr.open('GET' , $path , true);
     $xhr.send(null);
   }

    //singleton $xhr object
    this.$getXhr = function(){
      if(!$xhr){ 
        if (window.XMLHttpRequest) 
          $xhr = new XMLHttpRequest(); 
        else if (window.ActiveXObject) 
          $xhr = new ActiveXObject('Msxml2.XMLHTTP');
        else 
          throw new Error('Ajax is not supported by your browser');
      }
      return $xhr;
    }
  } //end of class LFRoute

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

//lf-repeate
function LfRepeat(){
  var $allRepeats;
  var $allDetails;
  var $collectionName; //$scope object property
  var $controllerName;
  var $tempScope;      //current property of $scope object with name of controller i.e. $scope.ControllerName = {}
  var that = this;

  //store all lf-repeat and lf-details
  this.$initRepeat = function(){
    $allRepeats = $main.$rootElement.querySelectorAll('[lf-repeat]');
    $allDetails = $main.$rootElement.querySelectorAll('[lf-detail]');
  }

  //perform lf-repeat
  this.$doRepeat = function(){
    var $currentRepeat; 
    var $innerBinds;  //all lf-binds inside lf-repeat
    var $bindAttr;    //name/attribute of those lf-binds
    for(var i = 0; i<$allRepeats.length;i++){
      $currentRepeat = $allRepeats[i];
      $collectionName = ($currentRepeat.getAttribute('lf-repeat')).trim();
      $controllerName = ($currentRepeat.getAttribute('lf-controller')).trim();
      
      //get scope and append controller name here
      $tempScope = $main.$scope[$controllerName];

      if($tempScope.hasOwnProperty($collectionName)){         //does $scope has that property mention at lf-repeat
        $innerBinds = $currentRepeat.querySelectorAll('[lf-bind]');
        that.$removeElements($currentRepeat,$innerBinds);     //remove lf-repeat's child elements
        for(var j=0;j<$tempScope[$collectionName].length;j++){  //iterate through all data in $scope.$controllerName
          for(var noOfBinds=0;noOfBinds<$innerBinds.length;noOfBinds++){
            $bindAttr = ($innerBinds[noOfBinds].getAttribute('lf-bind')).trim();
            if($tempScope[$collectionName][j].hasOwnProperty($bindAttr))  //$scope.nameOfController['name'] exists???
              that.$renderRepeat($currentRepeat , $innerBinds[noOfBinds] , j , $bindAttr);
          }
        }
      }
    }
  }


  //render only single element from data i.e [lf-detail="trainee of roll"] and roll is provided via url
  this.$doDetail = function(){
    var $currentDetail;
    var $innerBinds;
    var $attributes;
    var $bindAttr;
    var $index;
    var $key;
    for(var i=0;i<$allDetails.length;i++){
      $currentDetail = $allDetails[i];
      $attributes = ($currentDetail.getAttribute('lf-detail')).split('of');
      $collectionName = $attributes[0].trim();
      $key = $attributes[1].trim();     //key is property 
      $index = $main.$routeParam[$key]; //specific key that is provided by user

      $controllerName = ($currentDetail.getAttribute('lf-controller')).trim();
      $tempScope = $main.$scope[$controllerName];

      if($tempScope.hasOwnProperty($collectionName)){ 
        for(var i=0;i<$tempScope[$collectionName].length;i++){
          if($tempScope[$collectionName][i][$key] == $index){
            $innerBinds = $currentDetail.querySelectorAll('[lf-bind]');
            that.$removeElements($currentDetail,$innerBinds);

            for(var noOfBinds=0;noOfBinds<$innerBinds.length;noOfBinds++){
              $bindAttr = ($innerBinds[noOfBinds].getAttribute('lf-bind')).trim();
              if($tempScope[$collectionName][i].hasOwnProperty($bindAttr)){ 
                that.$renderRepeat($currentDetail , $innerBinds[noOfBinds] , i , $bindAttr);
              }
            }
          }
        } 
      }
    }
  }

  this.$removeElements = function($parent , $child){
    for(var i=0;i<$child.length;i++){
      $parent.removeChild($child[i]);
    }
  }

  this.$renderRepeat = function($parentNode , $childNode , $index , $key){
    $childNode = $childNode.cloneNode();
    $childNode.removeAttribute('lf-bind');
    $childNode.innerHTML = $tempScope[$collectionName][$index][$key];
    $parentNode.appendChild($childNode);
    $parentNode.innerHTML = $parentNode.innerHTML.replace('{{' + $key + '}}' , $tempScope[$collectionName][$index][$key]);
  }
  
} //end of class LfRepeat


///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

var $main = new Main();
$main.$bootstrap();

///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

})(window, document);