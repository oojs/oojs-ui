/**
 * SelectFileWidgets allow for selecting files, using the HTML5 File API. These
 * widgets can be configured with {@link OO.ui.mixin.IconElement icons}, {@link
 * OO.ui.mixin.IndicatorElement indicators} and {@link OO.ui.mixin.TitledElement titles}.
 * Please see the [OOUI documentation on MediaWiki] [1] for more information and examples.
 *
 * Although SelectFileWidget inherits from SelectFileInputWidget, it does not
 * behave as an InputWidget, and can't be used in HTML forms.
 *
 *     @example
 *     // A file select widget.
 *     var selectFile = new OO.ui.SelectFileWidget();
 *     $( document.body ).append( selectFile.$element );
 *
 * [1]: https://www.mediawiki.org/wiki/OOUI/Widgets
 *
 * @class
 * @extends OO.ui.SelectFileInputWidget
 * @mixins OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} [notsupported] Text to display when file support is missing in the browser.
 * @cfg {boolean} [droppable=true] Whether to accept files by drag and drop.
 * @cfg {boolean} [buttonOnly=false] Show only the select file button, no info field. Requires
 *  showDropTarget to be false.
 * @cfg {boolean} [showDropTarget=false] Whether to show a drop target. Requires droppable to be
 *  true.
 * @cfg {number} [thumbnailSizeLimit=20] File size limit in MiB above which to not try and show a
 *  preview (for performance).
 */
OO.ui.SelectFileWidget = function OoUiSelectFileWidget( config ) {
	var dragHandler, droppable,
		isSupported = this.constructor.static.isSupported();

	// Configuration initialization
	config = $.extend( {
		notsupported: OO.ui.msg( 'ooui-selectfile-not-supported' ),
		droppable: true,
		buttonOnly: false,
		showDropTarget: false,
		thumbnailSizeLimit: 20
	}, config );

	if ( !isSupported ) {
		config.disabled = true;
	}

	// Parent constructor
	OO.ui.SelectFileWidget.parent.call( this, config );

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this );

	if ( !isSupported ) {
		this.info.setValue( config.notsupported );
	}

	// Properties
	droppable = config.droppable && isSupported;
	this.showDropTarget = droppable && config.showDropTarget;
	this.thumbnailSizeLimit = config.thumbnailSizeLimit;

	// Events
	if ( droppable ) {
		dragHandler = this.onDragEnterOrOver.bind( this );
		this.$element.on( {
			dragenter: dragHandler,
			dragover: dragHandler,
			dragleave: this.onDragLeave.bind( this ),
			drop: this.onDrop.bind( this )
		} );
	}

	// Initialization
	if ( this.showDropTarget ) {
		this.selectButton.setIcon( 'upload' );
		this.$thumbnail = $( '<div>' ).addClass( 'oo-ui-selectFileWidget-thumbnail' );
		this.setPendingElement( this.$thumbnail );
		this.$element
			.addClass( 'oo-ui-selectFileWidget-dropTarget' )
			.on( {
				click: this.onDropTargetClick.bind( this )
			} )
			.append(
				this.$thumbnail,
				this.info.$element,
				this.selectButton.$element,
				$( '<span>' )
					.addClass( 'oo-ui-selectFileWidget-dropLabel' )
					.text( OO.ui.msg( 'ooui-selectfile-dragdrop-placeholder' ) )
			);
		this.fieldLayout.$element.remove();
	} else if ( config.buttonOnly ) {
		this.$element.append( this.selectButton.$element );
		this.fieldLayout.$element.remove();
	}

	this.$input
		.on( 'click', function ( e ) {
			// Prevents dropTarget to get clicked which calls
			// a click on this input
			e.stopPropagation();
		} )
		// Set empty title so that browser default tooltips like "No file chosen" don't appear.
		.attr( 'title', '' );

	this.$element.addClass( 'oo-ui-selectFileWidget' );

	this.updateUI();
};

/* Setup */

OO.inheritClass( OO.ui.SelectFileWidget, OO.ui.SelectFileInputWidget );
OO.mixinClass( OO.ui.SelectFileWidget, OO.ui.mixin.PendingElement );

/* Static Properties */

/**
 * Check if this widget is supported
 *
 * @static
 * @return {boolean}
 */
OO.ui.SelectFileWidget.static.isSupported = function () {
	var $input;
	if ( OO.ui.SelectFileWidget.static.isSupportedCache === null ) {
		$input = $( '<input>' ).attr( 'type', 'file' );
		OO.ui.SelectFileWidget.static.isSupportedCache = $input[ 0 ].files !== undefined;
	}
	return OO.ui.SelectFileWidget.static.isSupportedCache;
};

OO.ui.SelectFileWidget.static.isSupportedCache = null;

/* Events */

/**
 * @event change
 *
 * A change event is emitted when the on/off state of the toggle changes.
 *
 * @param {File|null} value New value
 */

/* Methods */

/**
 * Get the current value of the field
 *
 * @return {File|null}
 */
OO.ui.SelectFileWidget.prototype.getValue = function () {
	return this.currentFile;
};

/**
 * Set the current value of the field
 *
 * @param {File|null} file File to select
 */
OO.ui.SelectFileWidget.prototype.setValue = function ( file ) {
	if ( this.currentFile !== file ) {
		this.currentFile = file;
		this.emit( 'change', this.currentFile );
	}
};

/**
 * @inheritdoc
 */
OO.ui.SelectFileWidget.prototype.getFilename = function () {
	return this.currentFile ? this.currentFile.name : '';
};

/**
 * Disable InputWidget#onEdit listener, onFileSelected is used instead.
 * @inheritdoc
 */
OO.ui.SelectFileWidget.prototype.onEdit = function () {};

/**
 * @inheritdoc
 */
OO.ui.SelectFileWidget.prototype.updateUI = function () {
	// Too early, or not supported
	if ( !this.selectButton || !this.constructor.static.isSupported() ) {
		return;
	}

	// Parent method
	OO.ui.SelectFileWidget.super.prototype.updateUI.call( this );

	if ( this.currentFile ) {
		this.$element.removeClass( 'oo-ui-selectFileInputWidget-empty' );

		if ( this.showDropTarget ) {
			this.pushPending();
			this.loadAndGetImageUrl().done( function ( url ) {
				this.$thumbnail.css( 'background-image', 'url( ' + url + ' )' );
			}.bind( this ) ).fail( function () {
				this.$thumbnail.append(
					new OO.ui.IconWidget( {
						icon: 'attachment',
						classes: [ 'oo-ui-selectFileWidget-noThumbnail-icon' ]
					} ).$element
				);
			}.bind( this ) ).always( function () {
				this.popPending();
			}.bind( this ) );
			this.$element.off( 'click' );
		}
	} else {
		if ( this.showDropTarget ) {
			this.$element.off( 'click' );
			this.$element.on( {
				click: this.onDropTargetClick.bind( this )
			} );
			this.$thumbnail
				.empty()
				.css( 'background-image', '' );
		}
		this.$element.addClass( 'oo-ui-selectFileInputWidget-empty' );
	}
};

/**
 * If the selected file is an image, get its URL and load it.
 *
 * @return {jQuery.Promise} Promise resolves with the image URL after it has loaded
 */
OO.ui.SelectFileWidget.prototype.loadAndGetImageUrl = function () {
	var deferred = $.Deferred(),
		file = this.currentFile,
		reader = new FileReader();

	if (
		file &&
		( OO.getProp( file, 'type' ) || '' ).indexOf( 'image/' ) === 0 &&
		file.size < this.thumbnailSizeLimit * 1024 * 1024
	) {
		reader.onload = function ( event ) {
			var img = document.createElement( 'img' );
			img.addEventListener( 'load', function () {
				if (
					img.naturalWidth === 0 ||
					img.naturalHeight === 0 ||
					img.complete === false
				) {
					deferred.reject();
				} else {
					deferred.resolve( event.target.result );
				}
			} );
			img.src = event.target.result;
		};
		reader.readAsDataURL( file );
	} else {
		deferred.reject();
	}

	return deferred.promise();
};

/**
 * @inheritdoc
 */
OO.ui.SelectFileWidget.prototype.onFileSelected = function ( e ) {
	var file;

	if ( this.inputClearing ) {
		return;
	}

	file = OO.getProp( e.target, 'files', 0 ) || null;

	if ( file && !this.isAllowedType( file.type ) ) {
		file = null;
	}

	// After a file is selected clear the native widget to avoid confusion
	this.inputClearing = true;
	this.$input[ 0 ].value = '';
	this.inputClearing = false;

	this.setValue( file );
};

/**
 * Handle drop target click events.
 *
 * @private
 * @param {jQuery.Event} e Key press event
 * @return {undefined/boolean} False to prevent default if event is handled
 */
OO.ui.SelectFileWidget.prototype.onDropTargetClick = function () {
	if ( !this.isDisabled() && this.$input ) {
		this.$input.trigger( 'click' );
		return false;
	}
};

/**
 * Handle drag enter and over events
 *
 * @private
 * @param {jQuery.Event} e Drag event
 * @return {undefined/boolean} False to prevent default if event is handled
 */
OO.ui.SelectFileWidget.prototype.onDragEnterOrOver = function ( e ) {
	var itemOrFile,
		droppableFile = false,
		dt = e.originalEvent.dataTransfer;

	e.preventDefault();
	e.stopPropagation();

	if ( this.isDisabled() ) {
		this.$element.removeClass( 'oo-ui-selectFileWidget-canDrop' );
		dt.dropEffect = 'none';
		return false;
	}

	// DataTransferItem and File both have a type property, but in Chrome files
	// have no information at this point.
	itemOrFile = OO.getProp( dt, 'items', 0 ) || OO.getProp( dt, 'files', 0 );
	if ( itemOrFile ) {
		if ( this.isAllowedType( itemOrFile.type ) ) {
			droppableFile = true;
		}
	// dt.types is Array-like, but not an Array
	} else if ( Array.prototype.indexOf.call( OO.getProp( dt, 'types' ) || [], 'Files' ) !== -1 ) {
		// File information is not available at this point for security so just assume
		// it is acceptable for now.
		// https://bugzilla.mozilla.org/show_bug.cgi?id=640534
		droppableFile = true;
	}

	this.$element.toggleClass( 'oo-ui-selectFileWidget-canDrop', droppableFile );
	if ( !droppableFile ) {
		dt.dropEffect = 'none';
	}

	return false;
};

/**
 * Handle drag leave events
 *
 * @private
 * @param {jQuery.Event} e Drag event
 */
OO.ui.SelectFileWidget.prototype.onDragLeave = function () {
	this.$element.removeClass( 'oo-ui-selectFileWidget-canDrop' );
};

/**
 * Handle drop events
 *
 * @private
 * @param {jQuery.Event} e Drop event
 * @return {undefined/boolean} False to prevent default if event is handled
 */
OO.ui.SelectFileWidget.prototype.onDrop = function ( e ) {
	var file = null,
		dt = e.originalEvent.dataTransfer;

	e.preventDefault();
	e.stopPropagation();
	this.$element.removeClass( 'oo-ui-selectFileWidget-canDrop' );

	if ( this.isDisabled() ) {
		return false;
	}

	file = OO.getProp( dt, 'files', 0 );
	if ( file && !this.isAllowedType( file.type ) ) {
		file = null;
	}
	if ( file ) {
		this.setValue( file );
	}

	return false;
};

/**
 * @inheritdoc
 */
OO.ui.SelectFileWidget.prototype.setDisabled = function ( disabled ) {
	disabled = disabled || !this.constructor.static.isSupported();

	// Parent method
	OO.ui.SelectFileWidget.parent.prototype.setDisabled.call( this, disabled );
};
