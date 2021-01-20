export default Component.extend({
  moduleTracking: service('organization-custom-tracking@module-tracking'),
  /**
   * @override
   */
  init() {
    this._super(...arguments);
    /**
     * @property {String} trackingId represents the lifetime/instance of a page module
     */
    set(this, 'trackingId', generateTrackingId());
    get(this, 'moduleTracking').setupTracking(this);
  },
  /**
   * Fire custom view event when module is rendered
   * @override
   */
  onRender() {
    const { trackingId, moduleName } = getProperties(
      this,
      'trackingId',
      'moduleName'
    );
    get(this, 'moduleTracking').fireCustomView(moduleName, trackingId);
  },
  /**
   * Fire custom impression event when module is rendered and in the viewport
   * @override
   *
   * @param {Object} metadata metadata object contain visibleTime and duration
   */
  onImpression(metadata) {
    const { trackingId, moduleName, element } = getProperties(
      this,
      'trackingId',
      'moduleName',
      'element'
    );
    get(this, 'moduleTracking').fireCustomImpression(
      element,
      moduleName,
      trackingId,
      metadata
    );
  },
});