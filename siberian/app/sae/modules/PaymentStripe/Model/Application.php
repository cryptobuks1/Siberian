<?php

namespace PaymentStripe\Model;

use Core\Model\Base;
use Siberian\Exception;

/**
 * Class Application
 * @package PaymentStripe\Model
 */
class Application extends Base
{
    /**
     * Application constructor.
     * @param array $params
     * @throws \Zend_Exception
     */
    public function __construct($params = [])
    {
        parent::__construct($params);
        $this->_db_table = 'PaymentStripe\Model\Db\Table\Application';
        return $this;
    }

    /**
     * @param null $appId
     * @return Application|null
     * @throws Exception
     * @throws \Zend_Exception
     */
    public static function getSettings($appId = null)
    {
        // Checking $appId, and/or fallback on context application!
        if ($appId === null) {
            $application = self::getApplication();
            if (!$application &&
                !$application->getId()) {
                throw new Exception(p__("payment_stripe", "An app id is required."));
            }

            $appId = $application->getId();
        }

        // Fetching current Stripe settings!
        $settings = (new self())->find($appId);
        if (!$settings->getId()) {
            throw new Exception(p__("payment_stripe", "Stripe is not configured."));
        }

        return $settings;
    }

    /**
     * @param null $appId
     * @return bool
     */
    public static function isAvailable($appId = null)
    {
        try {
            self::getSettings($appId);
        } catch (\Exception $e) {
            return false;
        }

        return true;
    }
}