<?php

namespace Push\Model;

use Core\Model\Base;

use Push_Model_Certificate as Certificate;
use Push_Model_Ios_Message as IosMessage;
use Push_Model_Android_Message as AndroidMessage;
use Push_Model_Firebase as Firebase;
use Push_Model_Message as Message;
use Push_Model_Android_Device as AndroidDevice;
use Push_Model_Iphone_Device as IosDevice;

use Siberian\Json;
use Siberian\Cron;
use Siberian_Service_Push_Apns as Apns;
use Siberian\Exception;
use Siberian\CloudMessaging\Sender\Fcm;

use Zend_Registry as Registry;

/**
 * Class StandalonePush
 * @package Push\Model
 *
 * @method string getIcon()
 * @method $this setValueId(integer $valueId)
 * @method $this setAppId(integer $appId)
 * @method $this setTokens(string $tokens)
 * @method $this setPushDeviceId(integer $deviceId)
 * @method $this setTarget($target)
 * @method $this setStatus(string $status)
 * @method $this setTitle(string $title)
 * @method $this setCover(string $cover)
 * @method $this setMessage(string $message)
 * @method $this setActionValue(mixed $actionValue)
 * @method $this setSendAt(integer $timestamp)
 * @method $this setMessageJson(string $jsonMessage)
 * @method string getTokens()
 * @method string getMessageJson()
 * @method $this[] findAll($values, $order = null, $params = [])
 */
class StandalonePush extends Base
{
    /**
     * @var string[]
     */
    public $tokens;

    /**
     * @var AndroidDevice[]
     */
    public $androidDevices;

    /**
     * @var IosDevice[]
     */
    public $iosDevices;

    /**
     * StandalonePush constructor.
     * @param array $params
     * @throws \Zend_Exception
     */
    public function __construct($params = [])
    {
        parent::__construct($params);
        $this->_db_table = "Push\Model\Db\Table\StandalonePush";
        return $this;
    }

    /**
     * @todo remove me when done
     */
    public function test ()
    {
        echo "<pre>";

        $tokens = [
            "fnHvqu-1Of0:APA91bHzawM0lpGZEuouM1U4tkhB2fRNGJOkMCPQBcnkaDkIIFGR6-p4DphornZZ_nz_x9kxTOtfuv3M7ViQ_8WaN38slpkXBYwcDYtImzHZAMNrkJVTkHcDeBcc_1I7KEXBOknQi3Ab",
            "eDmTmifwDcQ:APA91bFvO9ds-gjm50bYe9oQBsFJNBBrRWMtRCfgDq3wVElDhvF8y-FQibML-Z0c6VNJ66LlzieNbvLG8ORcOgHyhVo9Xi7d3RHHTaA22_ADz1iKfn2w6vzgM58dpXuCLiwZQqfMS0_E",
            "c4iMBIySOow:APA91bF3LfsX_5rv9OxYD31ElO91GKnYKbbEiGhJLpA584y0ecmkLb85pSHLm_xVN0LHDu2Kl4U_O81as1B5HsaQDBZ86vrYw5V6KtJJ3wYW5Sb7H3XqcBfaYYmAz7ZFiALmQ69ZNdUo",
            "eu-ggp3BIOk:APA91bG6AgVsxVW46Wx2yUSg8PnwsNtXun772Ir5JvFdiIZRajwCkKnXFPqWvtXgUxW6n9giEmtbfhijavJIy30eh5sEWdnvXVzc7uEYdZDawvCn8lyM9LQM5W3mLyReQgK7VrwSEjVn",
            "eD81RYixnWI:APA91bHuAvRVU0CZil3sETsuYloA2H9XJDxcNADIlXMdWZVzaSApB6y8srAayF3O1_iY-yJjFK5gugs82IuDWD_UpTIXIWeSi6WltqcdqZuR60TSDEOOlQYs46FpBmRtF2atxfFD-1BH",
            "c0UdOoqe9DU:APA91bEYfF7S_cCCjKjfa3gm9mC_6XChWlmWCQs0BK8zkWmZGMs6GYIDzuwQW-coYxuqT9UrWsnapi08CJsIA0oz0nLQxpwhAK3xMXADmPZtQ0kpjds6rBEWqMZ7P5jkBK55xmQrhFEu",
            "dzbGUwtn6Vs:APA91bHiKW99oC3RA3hpGGbw0EQIdHtmK1U1fn8U8cwpPxPLa-O-bBWXGVJFQGhQpv8AX8lNbOCJTzDSa--sP8LclbzJezLI8LMezBLwaG_ICU-FugyapKhxVNwhqFhTnhjQh4p49leT",
            "5532d50f91054ac10f91be24686ca476c62cd5a8b863b50a3ff38a292863d7d4",
            "9278e0eb4b0186023bb2cea4382ef5941a5c17208e52c51de5cc4ff41b89e4c7",
        ];

        $instance = self::buildFromTokens($tokens);
        $instance->scheduleMessage(
            "Test title",
            "Test message",
            1566226109,
            null,
            null,
            null
        );
    }

    /**
     * @param array $tokens
     * @return StandalonePush
     * @throws \Zend_Exception
     */
    public static function buildFromTokens (array $tokens = [])
    {
        $instance = new self();

        $instance->tokens = $tokens;

        $instance->androidDevices = (new AndroidDevice())->findAll([
            "registration_id IN (?)" => $tokens
        ]);

        $instance->iosDevices = (new IosDevice())->findAll([
            "device_token IN (?)" => $tokens
        ]);

        return $instance;
    }

    /**
     * @param $title
     * @param $text
     * @param $cover
     * @param null $actionValue
     * @param null $valueId
     * @param null $appId
     * @throws \Zend_Exception
     */
    public function sendMessage($title,
                                $text,
                                $cover,
                                $actionValue = null,
                                $valueId = null,
                                $appId = null)
    {
        // Save push in custom history
        $this
            ->setValueId($valueId)
            ->setAppId($appId)
            ->setTokens(Json::encode($this->tokens))
            ->setTitle($title)
            ->setMessage($text)
            ->setCover($cover)
            ->setActionValue($actionValue)
            ->setStatus("sent")
            ->save();

        $message = self::buildMessage($title, $text, $cover, $actionValue);

        // try/catch are already handled inside sendPush
        foreach ($this->androidDevices as $androidDevice) {
            $this->sendPush($androidDevice, $message);
        }

        // try/catch are already handled inside sendPush
        foreach ($this->iosDevices as $iosDevice) {
            $this->sendPush($iosDevice, $message);
        }
    }

    /**
     * @param string $title
     * @param string $text
     * @param string $cover
     * @param integer $sendAt
     * @param mixed|null $actionValue
     * @param integer|null $valueId
     * @param integer|null $appId
     * @throws \Zend_Exception
     * @throws Exception
     */
    public function scheduleMessage($title,
                                    $text,
                                    $cover,
                                    $sendAt,
                                    $actionValue = null,
                                    $valueId = null,
                                    $appId = null)
    {
        // Checking timestamp!
        if ($sendAt < time()) {
            throw new Exception(p__("push", "Error: %s must be a timestamp in the past.", "\$sentAt"));
        }

        $jsonMessage = [
            "title" => $title,
            "text" => $text,
            "cover" => $cover,
            "actionValue" => $actionValue,
        ];

        // Save push in custom history
        $this
            ->setValueId($valueId)
            ->setAppId($appId)
            ->setTokens(Json::encode($this->tokens))
            ->setTitle($title)
            ->setMessage($text)
            ->setCover($cover)
            ->setActionValue($actionValue)
            ->setSendAt($sendAt)
            ->setStatus("scheduled")
            ->setMessageJson(Json::encode($jsonMessage))
            ->save();
    }

    /**
     * @param AndroidDevice|IosDevice $device
     * @param Message $message
     * @throws \Zend_Exception
     */
    public function sendPush($device, $message)
    {
        $logger = Registry::get("logger");
        $appId = $device->getAppId();

        $iosCertificate = path(Certificate::getiOSCertificat($appId));

        if ($device instanceof IosDevice) {
            try {
                $message->setToken($device->getDeviceToken());

                if (is_file($iosCertificate)) {
                    $instance = new IosMessage(new Apns(null, $iosCertificate));
                    $instance->setMessage($message);
                    $instance->push();
                } else {
                    throw new Exception("You must provide an APNS Certificate for the App ID: {$appId}");
                }
            } catch (\Exception $e) {
                $logger->err(
                    sprintf("[Push Standalone: %s]: %s",
                        date("Y-m-d H:i:s"),
                        $e->getMessage()
                    ),
                    "standalone_push");
            }
        } else if ($device instanceof AndroidDevice) {
            try {
                $message->setToken($device->getRegistrationId());

                $credentials = (new Firebase())
                    ->find("0", "admin_id");

                $fcmKey = $credentials->getServerKey();
                $fcmInstance = null;
                if (!empty($fcmKey)) {
                    $fcmInstance = new Fcm($fcmKey);
                } else {
                    // Only FCM is mandatory by now!
                    throw new Exception("You must provide FCM Credentials");
                }

                $instance = new AndroidMessage($fcmInstance, null);
                $instance->setMessage($message);
                $instance->push();

            } catch (\Exception $e) {
                $logger->err(
                    sprintf("[Push Standalone: %s]: %s",
                        date("Y-m-d H:i:s"),
                        $e->getMessage()
                    ),
                    "standalone_push");
            }
        }
    }

    /**
     * @param Cron $cron
     * @throws \Zend_Exception
     */
    public static function sendScheduled (Cron $cron)
    {
        $cron->log(sprintf("[Standalone Push]: time %s.", time()));

        $messagesToSend = (new self())->findAll([
            "status = ?" => "scheduled",
            "send_at < ?" => time()
        ]);

        if ($messagesToSend->count() === 0) {
            $cron->log("[Standalone Push]: no scheduled push, done.");
            return;
        }

        $cron->log(sprintf("[Standalone Push]: there is %s messages to send.", $messagesToSend->count()));

        foreach ($messagesToSend as $messageToSend) {
            $pushMessage = Json::decode($messageToSend->getMessageJson());
            $tokens = Json::decode($messageToSend->getTokens());

            $cron->log(sprintf("[Standalone Push]: message %s.", $pushMessage["title"]));
            $cron->log(sprintf("[Standalone Push]: sending to %s.", join(", ", $tokens)));

            $instance = self::buildFromTokens($tokens);

            $message = self::buildMessage(
                $pushMessage["title"],
                $pushMessage["text"],
                $pushMessage["cover_"],
                $pushMessage["action_value"]);

            // try/catch are already handled inside sendPush
            foreach ($instance->androidDevices as $androidDevice) {
                $instance->sendPush($androidDevice, $message);
            }

            // try/catch are already handled inside sendPush
            foreach ($instance->iosDevices as $iosDevice) {
                $instance->sendPush($iosDevice, $message);
            }

            $messageToSend
                ->setStatus("sent")
                ->save();
        }

        $cron->log("[Standalone Push]: done.");
    }

    /**
     * @param string $title
     * @param string $text
     * @param string $cover
     * @param mixed $actionValue
     * @return Message
     * @throws \Zend_Exception
     */
    public static function buildMessage ($title, $text, $cover, $actionValue)
    {
        $message = new Message();
        $message
            ->setIsStandalone(true)
            ->setTitle($title)
            ->setText($text)
            ->setCover($cover)
            ->setSendToAll(false)
            ->setActionValue($actionValue)
            ->setForceAppRoute(true)
            ->setBase64(false);

        return $message;
    }
}